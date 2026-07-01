#!/usr/bin/env python3
"""Send a photo to Telegram.

Reads the bot token and chat ID from a .env / .env.local file located in the
directory the skill was invoked from (or --env-dir). Image path is required.
Optional caption text comes from --caption or stdin (if --stdin flag is passed).

No third-party dependencies (stdlib only).
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

TOKEN_KEYS = ("TELEGRAM_BOT_TOKEN", "TELEGRAM_TOKEN", "BOT_TOKEN")
CHAT_KEYS = ("TELEGRAM_CHAT_ID", "TELEGRAM_CHAT", "CHAT_ID")


def parse_env_file(path: str) -> dict:
    out = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("export "):
                    line = line[len("export "):].strip()
                if "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip()
                if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
                    val = val[1:-1]
                if key:
                    out[key] = val
    except FileNotFoundError:
        pass
    return out


def load_env(env_dir: str) -> dict:
    home = os.path.expanduser("~")
    sources = [
        os.path.join(home, ".env"),
        os.path.join(home, ".env.local"),
        os.path.join(env_dir, ".env"),
        os.path.join(env_dir, ".env.local"),
    ]
    merged = {}
    seen = set()
    for path in sources:
        real = os.path.abspath(path)
        if real in seen:
            continue
        seen.add(real)
        merged.update(parse_env_file(path))
    for k, v in os.environ.items():
        merged[k] = v
    return merged


def pick(env: dict, keys) -> str | None:
    for k in keys:
        v = env.get(k)
        if v:
            return v
    return None


def send_photo(token: str, chat_id: str, image_path: str, caption: str | None) -> dict:
    boundary = "----TelegramPhotoBoundary"
    with open(image_path, "rb") as f:
        image_data = f.read()

    filename = os.path.basename(image_path)
    parts = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n{chat_id}\r\n',
    ]
    if caption:
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n{caption}\r\n'
        )
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="photo"; filename="{filename}"\r\nContent-Type: image/png\r\n\r\n'
    )
    body = "".join(parts).encode() + image_data + f"\r\n--{boundary}--\r\n".encode()

    url = f"https://api.telegram.org/bot{token}/sendPhoto"
    req = urllib.request.Request(
        url, data=body, method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read())
        except Exception:
            return {"ok": False, "error_code": e.code, "description": str(e)}


def main():
    p = argparse.ArgumentParser(description="Send a photo to Telegram.")
    p.add_argument("image", help="Path to the image file to send.")
    p.add_argument("--caption", help="Optional caption text.")
    p.add_argument("--env-dir", default=os.getcwd(),
                   help="Directory holding .env / .env.local (default: cwd).")
    p.add_argument("--token", help="Override bot token (else from env/.env).")
    p.add_argument("--chat-id", help="Override chat ID (else from env/.env).")
    args = p.parse_args()

    if not os.path.isfile(args.image):
        print(f"Error: image file not found: {args.image}", file=sys.stderr)
        sys.exit(2)

    env = load_env(args.env_dir)
    token = args.token or pick(env, TOKEN_KEYS)
    chat_id = args.chat_id or pick(env, CHAT_KEYS)

    if not token:
        print(f"Error: no bot token. Set one of {TOKEN_KEYS} in "
              f"{args.env_dir}/.env(.local), or pass --token.", file=sys.stderr)
        sys.exit(2)
    if not chat_id:
        print(f"Error: no chat ID. Set one of {CHAT_KEYS} in "
              f"{args.env_dir}/.env(.local), or pass --chat-id.", file=sys.stderr)
        sys.exit(2)

    body = send_photo(token, chat_id, args.image, args.caption)
    if not body.get("ok"):
        print(f"Telegram error: {body}", file=sys.stderr)
        sys.exit(1)
    print(f"✓ Sent photo to chat {chat_id} (message_id {body['result'].get('message_id')}).")


if __name__ == "__main__":
    main()
