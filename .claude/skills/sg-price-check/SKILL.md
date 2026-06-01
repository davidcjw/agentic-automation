---
name: sg-price-check
description: Scrape Singapore household appliance prices from Gain City, Harvey Norman, Courts, Best Denki, and Audio House by model number, then send a Telegram price comparison with direct product links. Use when user provides an appliance model number (e.g. RT47CG6444S9SS) and wants to compare Singapore retail prices, or says "price check", "compare prices", "cheapest price", or names any of these Singapore retailers.
---

# SG Appliance Price Checker

## Quick Start

User provides a model number. Scrape all 5 retailers, collect prices + URLs, then send via Telegram.

## Step 1 — Search each retailer with Playwright

For each retailer, navigate to the search URL, take a snapshot, find the exact model match, and extract price + product URL. Work through all 5 retailers sequentially.

| Retailer | Search URL | Notes |
|---|---|---|
| Gain City | `https://www.gaincity.com/catalogsearch/result/?q={MODEL}` | Magento — often redirects directly to product page |
| Harvey Norman | `https://www.harveynorman.com.sg/index.php?dispatch=products.search&q={MODEL}` | CS-Cart + Attraqt; products load via JS. Call Attraqt API (POST `https://api-eu.attraqt.io/search` with `{"token":"6312214213f7917d9518a57a","query":"{MODEL}","language":"en","pageSize":5}`) from within the page context to get `items[0].product.url` and `items[0].product.price` |
| Courts | `https://www.courts.com.sg/catalogsearch/result/?q={MODEL}` | Magento — often redirects directly to product page |
| Best Denki | `https://www.bestdenki.com.sg/catalogsearch/result/?q={MODEL}` | Magento — renders product list in DOM |
| Audio House | `https://audiohouse.com.sg/?s={MODEL}&post_type=product` | WordPress/WooCommerce — check if model appears in results |

For each site:
1. Navigate to the search URL with the model number substituted
2. Take a browser snapshot
3. Scan results for an **exact model number match** (not a similar model)
4. If found: extract the SGD price and the direct product page URL
5. If not found or site errors: record as "Not available"

## Step 2 — Send via Telegram

After collecting all results, run this Python script. Pass results as a JSON string argument.

```bash
source /Users/davidcjw/code/.env
python3 /Users/davidcjw/.claude/skills/sg-price-check/scripts/send_telegram.py \
  --token "$TELEGRAM_API_TOKEN" \
  --chat-id "$TELEGRAM_CHAT_ID" \
  --model "MODEL_NUMBER" \
  --results '[
    {"retailer": "Gain City", "price": "1599", "url": "https://..."},
    {"retailer": "Harvey Norman", "price": "Not available", "url": null},
    ...
  ]'
```

`price` should be numeric string (e.g. `"1599"`) or `"Not available"`. `url` is `null` if not found.

## Notes

- Match model numbers exactly — e.g. RT47CG6444S9SS should not match RT47CG6444
- Prefer direct product page URLs over search result page URLs
- If a retailer's search works but the model isn't listed, mark "Not available"
- If the site is unresponsive or blocks the crawler, mark "Not available"
- Prices are always SGD
