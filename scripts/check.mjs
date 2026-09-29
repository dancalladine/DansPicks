// Sanity-checks data.js: unique ids, valid categories, every `similar` id
// exists, every manifest image is on disk, and every shop URL responds.
//
//   node scripts/check.mjs

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = async (file, name) =>
  new Function(`${await readFile(path.join(root, file), "utf8")}; return ${name};`)();

const SHOPS = await load("data.js", "SHOPS");
const CATEGORIES = await load("data.js", "CATEGORIES");
const IMAGES = await load("images/manifest.js", "IMAGES");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

const problems = [];
const notes = [];
const ids = new Set();

for (const shop of SHOPS) {
  if (ids.has(shop.id)) problems.push(`${shop.id}: duplicate id`);
  ids.add(shop.id);
  if (!CATEGORIES[shop.category]) problems.push(`${shop.id}: unknown category "${shop.category}"`);
  if (!["£", "££", "£££"].includes(shop.price)) problems.push(`${shop.id}: price should be £, ££ or £££`);
}

for (const shop of SHOPS) {
  for (const id of shop.similar) {
    if (!ids.has(id)) problems.push(`${shop.id}: similar id "${id}" doesn't exist`);
    if (id === shop.id) problems.push(`${shop.id}: lists itself as similar`);
  }
  const image = IMAGES[shop.id];
  if (!image) notes.push(`${shop.id}: no image (initials tile shown)`);
  else if (!existsSync(path.join(root, "images", image.file))) problems.push(`${shop.id}: images/${image.file} missing`);
}

await Promise.all(
  SHOPS.map(async (shop) => {
    try {
      const res = await fetch(shop.url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
      // Etsy and Cloudflare-protected shops refuse scripts with 403 but work in a browser.
      if (res.status === 403) notes.push(`${shop.id}: 403 to scripts (bot protection), check in a browser`);
      else if (!res.ok) problems.push(`${shop.id}: ${shop.url} returned ${res.status}`);
    } catch (err) {
      problems.push(`${shop.id}: ${shop.url} failed (${err.message})`);
    }
  }),
);

notes.sort().forEach((n) => console.log(`note  ${n}`));
problems.sort().forEach((p) => console.log(`FAIL  ${p}`));
console.log(`\n${SHOPS.length} shops checked: ${problems.length} problem(s), ${notes.length} note(s).`);
process.exitCode = problems.length ? 1 : 0;
