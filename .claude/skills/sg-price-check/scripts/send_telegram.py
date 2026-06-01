#!/usr/bin/env python3
"""Send appliance price comparison to Telegram."""

import argparse
import json
import sys
import urllib.request
import urllib.parse


def send_telegram(token: str, chat_id: str, text: str) -> None:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": "true",
    }).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    with urllib.request.urlopen(req) as resp:
        body = json.loads(resp.read())
        if not body.get("ok"):
            print(f"Telegram error: {body}", file=sys.stderr)
            sys.exit(1)


def format_message(model: str, results: list[dict]) -> str:
    lines = [f"<b>🔍 Price comparison: {model}</b>\n"]

    available = []
    for r in results:
        retailer = r["retailer"]
        price = r.get("price", "Not available")
        url = r.get("url")

        if price != "Not available" and price:
            try:
                price_num = float(str(price).replace(",", "").replace("$", ""))
                available.append((retailer, price_num, url))
                price_display = f"${price_num:,.0f}"
            except ValueError:
                price_display = price
        else:
            price_display = "Not available"

        if url:
            lines.append(f'🏪 <a href="{url}">{retailer}</a>: {price_display}')
        else:
            lines.append(f"🏪 {retailer}: {price_display}")

    if available:
        cheapest = min(available, key=lambda x: x[1])
        retailer, price_num, url = cheapest
        lines.append(f"\n💰 Cheapest: <b>{retailer}</b> at <b>${price_num:,.0f}</b>")
    else:
        lines.append("\n❌ No prices found across all retailers.")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Send price comparison to Telegram")
    parser.add_argument("--token", required=True, help="Telegram bot token")
    parser.add_argument("--chat-id", required=True, help="Telegram chat ID")
    parser.add_argument("--model", required=True, help="Appliance model number")
    parser.add_argument("--results", required=True, help="JSON array of results")
    args = parser.parse_args()

    try:
        results = json.loads(args.results)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON for --results: {e}", file=sys.stderr)
        sys.exit(1)

    message = format_message(args.model, results)
    print("Sending to Telegram:\n")
    print(message)
    print()

    send_telegram(args.token, args.chat_id, message)
    print("✓ Sent to Telegram.")


if __name__ == "__main__":
    main()
