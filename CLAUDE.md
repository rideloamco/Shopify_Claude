# Loam Co. theme — working notes

Shopify custom theme. White colourway (black text, white background, neon
`#DAEE01` accent used only on dark backgrounds or as a highlight behind black text).

## Standing preferences (keep these on every change)

- **Homepage "Shop Collection" shows 8 products.** Keep
  `products_to_show` at 8 in both `sections/shop-collection.liquid`
  (schema default) and `config/settings_data.json`. Uploading a zip
  overwrites live settings, so this must stay 8 in the repo or it reverts.
- **Brand voice:** standalone, worldwide. No location-as-identity
  ("UK-built", "UK-owned", "South Wales", "Tweed Valley") and no
  competitor-pricing / "no prestige tax" messaging. Operational facts like
  "Free UK shipping over £50" are fine.
- **Neon (#DAEE01) is only legible on dark.** On light backgrounds use
  black text, or black text on a neon highlight block — never neon text.

## Deploy

No Shopify CLI available. Zip `theme/` and upload via Shopify admin
(Online Store → Themes → Add theme → Upload zip file), or use the Admin
GraphQL staged-upload + `themeCreate` flow. Note: uploading includes
`config/settings_data.json`, which overwrites the merchant's live
theme-editor settings.
