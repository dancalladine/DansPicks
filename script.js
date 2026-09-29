const IMAGES_BY_ID = typeof IMAGES === "undefined" ? {} : IMAGES;
const byId = new Map(SHOPS.map((shop) => [shop.id, shop]));
const productById = new Map((typeof PRODUCTS === "undefined" ? [] : PRODUCTS).map((p) => [p.id, p]));

function productsFor(shop) {
  return (shop.products ?? []).map((id) => productById.get(id)).filter(Boolean);
}

const HASH_FOR_CAT = { all: "", gifts: "gifts", "food-drink": "food", clothing: "clothing" };
const CAT_FOR_HASH = Object.fromEntries(Object.entries(HASH_FOR_CAT).map(([cat, hash]) => [hash, cat]));
const SIMILAR_COUNT = 3;

const grid = document.getElementById("grid");
const tabs = [...document.querySelectorAll(".tab")];
const dialog = document.getElementById("detail");

// ---------- Rendering helpers ----------

function initialsFor(name) {
  return name
    .replace(/[^A-Za-zÀ-ÿ\s&]/g, "")
    .split(/\s+/)
    .filter((word) => word && word !== "&" && word.toLowerCase() !== "the")
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

// A stable 1–3 colour for the initials tile, so each shop keeps the same one.
function toneFor(id) {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return (sum % 3) + 1;
}

function mediaFor(shop, className = "media") {
  const media = document.createElement("div");
  media.className = className;
  const image = IMAGES_BY_ID[shop.id];

  const fallback = () => {
    media.classList.remove("contain");
    media.classList.add(`tone-${toneFor(shop.id)}`);
    media.innerHTML = "";
    const initials = document.createElement("span");
    initials.className = "initials";
    initials.textContent = initialsFor(shop.name);
    media.append(initials);
  };

  if (!image) {
    fallback();
    return media;
  }

  if (image.fit === "contain") media.classList.add("contain");
  const img = document.createElement("img");
  img.src = `images/${image.file}`;
  img.alt = "";
  img.loading = "lazy";
  img.addEventListener("error", fallback);
  media.append(img);
  return media;
}

function cardFor(shop) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";
  card.setAttribute("aria-label", `${shop.name}: ${shop.blurb}`);

  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `
    <div class="card-top">
      <h2 class="card-name"></h2>
      <span class="price"></span>
    </div>
    <p class="card-blurb"></p>
    <p class="card-try"></p>
    <span class="card-cat"></span>`;
  body.querySelector(".card-name").textContent = shop.name;
  body.querySelector(".price").textContent = shop.price;
  body.querySelector(".card-blurb").textContent = shop.blurb;
  body.querySelector(".card-cat").textContent = CATEGORIES[shop.category];

  const tryLine = body.querySelector(".card-try");
  const products = productsFor(shop);
  if (products.length) {
    tryLine.innerHTML = "<strong>If you like this, try:</strong> ";
    tryLine.append(products.map((p) => p.name).join(" · "));
  } else {
    tryLine.remove();
  }

  card.append(mediaFor(shop), body);
  card.addEventListener("click", () => openDetail(shop));
  return card;
}

// A recommended product links straight out to its page on the shop's site.
function productCardFor(product) {
  const shop = byId.get(product.shop);
  const link = document.createElement("a");
  link.className = "card product";
  link.href = product.url;
  link.target = "_blank";
  link.rel = "noopener";
  link.setAttribute("aria-label", `${product.name} from ${shop?.name ?? "the shop"}, ${product.price} (opens in a new tab)`);

  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `
    <h4 class="card-name"></h4>
    <p class="product-shop"></p>
    <p class="product-price"></p>`;
  body.querySelector(".card-name").textContent = product.name;
  body.querySelector(".product-shop").textContent = shop?.name ?? "";
  body.querySelector(".product-price").textContent = `${product.price} ↗`;

  link.append(mediaFor(product), body);
  return link;
}

// ---------- Grid & tabs ----------

function currentCategory() {
  return CAT_FOR_HASH[location.hash.slice(1)] ?? "all";
}

function renderGrid() {
  const cat = currentCategory();
  tabs.forEach((tab) => tab.setAttribute("aria-pressed", String(tab.dataset.cat === cat)));
  const shops = SHOPS.filter((shop) => shop.pick && (cat === "all" || shop.category === cat));
  grid.replaceChildren(...shops.map(cardFor));
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const hash = HASH_FOR_CAT[tab.dataset.cat];
    if (hash) {
      location.hash = hash;
    } else {
      history.replaceState(null, "", location.pathname + location.search);
      renderGrid();
    }
  });
});

window.addEventListener("hashchange", renderGrid);

// ---------- "You might also like" ----------

function similarFor(shop) {
  const chosen = shop.similar.map((id) => byId.get(id)).filter(Boolean);

  if (chosen.length < SIMILAR_COUNT) {
    const taken = new Set([shop.id, ...chosen.map((s) => s.id)]);
    const tags = new Set(shop.tags);
    const extras = SHOPS.filter((other) => other.pick && !taken.has(other.id))
      .map((other) => ({
        other,
        score: other.tags.filter((tag) => tags.has(tag)).length * 2 + (other.category === shop.category ? 1 : 0),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    chosen.push(...extras.slice(0, SIMILAR_COUNT - chosen.length).map(({ other }) => other));
  }

  return chosen.slice(0, SIMILAR_COUNT);
}

// ---------- Detail dialog ----------

function openDetail(shop) {
  dialog.querySelector(".detail-media").replaceWith(mediaFor(shop, "detail-media media"));
  dialog.querySelector(".detail-cat").textContent = CATEGORIES[shop.category];
  dialog.querySelector(".detail-name").textContent = shop.name;
  dialog.querySelector(".detail-blurb").textContent = shop.blurb;
  dialog.querySelector(".detail-price").innerHTML = `Price guide: <strong></strong>`;
  dialog.querySelector(".detail-price strong").textContent = shop.price;

  const visit = dialog.querySelector(".visit");
  visit.href = shop.url;
  visit.setAttribute("aria-label", `Visit ${shop.name} (opens in a new tab)`);

  const products = productsFor(shop);
  dialog.querySelector(".recs").hidden = products.length === 0;
  dialog.querySelector(".product-row").replaceChildren(...products.map(productCardFor));

  const similar = similarFor(shop);
  dialog.querySelector(".similar").hidden = similar.length === 0;
  dialog.querySelector(".similar-row").replaceChildren(...similar.map(cardFor));

  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  visit.focus();
}

dialog.querySelector(".close").addEventListener("click", () => dialog.close());

// Clicking the dimmed backdrop (outside the dialog box) closes it.
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  const inside =
    event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
  if (!inside) dialog.close();
});

renderGrid();
