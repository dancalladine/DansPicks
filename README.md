# DansPicks

A showcase of Dan's favourite independent shops, split into **Gifts**, **Food & Drink** and **Clothing**. Each card links straight through to the shop. Each card also recommends specific products from other shops (**"If you like this, try: …"**), and each pop-up has a row of similar shops.

It's plain HTML, CSS and JavaScript, with no build step and no dependencies.

## Running it locally

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`. Opening `index.html` directly also works.

## Adding a shop

1. Add an entry to `SHOPS` in [`data.js`](data.js):

   ```js
   {
     id: "shop-name",                 // unique, lowercase-with-dashes
     name: "Shop Name",
     url: "https://example.com/",
     category: "gifts",               // gifts | food-drink | clothing
     blurb: "One line on what they sell",
     price: "££",                     // £ under £20, ££ £20–£60, £££ £60+
     tags: ["soap", "handmade"],      // used to find similar shops
     pick: true,                      // true = in the main grid; false = only shown as a suggestion
     similar: ["other-shop-id"],      // shops to suggest alongside this one
   }
   ```

2. Fetch its image:

   ```bash
   node scripts/fetch-images.mjs
   ```

   This saves the shop's own social-preview image into `images/` and records it in `images/manifest.js`. Some sites, such as Etsy, block scripts. For those, save an image into `images/` yourself and add a line to the manifest. Until then the card shows a coloured tile with the shop's initials.

3. Check everything:

   ```bash
   node scripts/check.mjs
   ```

   This flags duplicate ids, `similar` ids that don't exist, missing image files and dead links.

### Recommending specific products

Each pick can recommend individual products from other shops. These appear as an "If you like this, try: …" line on the card and as linked product rows in the pop-up.

1. Add the product to `PRODUCTS` at the bottom of `data.js`. Its `shop` must be the id of a shop in `SHOPS`; add the shop there as `pick: false` if it isn't listed yet.

   ```js
   { id: "shop-product-name", name: "Short Product Name", shop: "shop-id", price: "£12",
     url: "https://example.com/products/thing" },
   ```

2. Add its id to the pick's `products: [...]` list.
3. Run `node scripts/fetch-images.mjs`, which saves product images into `images/products/`, then `node scripts/check.mjs`.

Prices are copied from the shop when a product is added, so they can drift over time.

### How "Similar shops" works

A shop's `similar` list is shown first. If it has fewer than three entries, the row is filled with Dan's other picks that share the most tags, with a nudge towards the same category.

## Project structure

| File | Purpose |
| --- | --- |
| [`index.html`](index.html) | Page layout: header, category tabs, grid and shop pop-up |
| [`style.css`](style.css) | Styles, with light and dark themes |
| [`data.js`](data.js) | Every shop, category and recommended product |
| [`script.js`](script.js) | Renders the grid, handles tabs (saved in the URL, e.g. `#food`), opens the pop-up and picks similar shops |
| [`images/`](images) | Shop images (products in `images/products/`), plus `manifest.js` mapping ids to files |
| [`scripts/fetch-images.mjs`](scripts/fetch-images.mjs) | Downloads shop preview images |
| [`scripts/check.mjs`](scripts/check.mjs) | Checks the data and links |

## Hosting

The site is fully static, so it can be hosted for free on GitHub Pages (push the repo and enable Pages on the `main` branch), Netlify or Cloudflare Pages.
