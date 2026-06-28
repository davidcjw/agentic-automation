#!/usr/bin/env python3
"""Send an arbitrary message to Telegram.

Reads the bot token and chat ID from a .env / .env.local file located in the
directory the skill was invoked from (or --env-dir). Message text comes from
--text or, if omitted, stdin — so you can pipe arbitrary input in.

No third-party dependencies (stdlib only).
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

# Variable names we look for, in priority order.
TOKEN_KEYS = ("TELEGRAM_BOT_TOKEN", "TELEGRAM_TOKEN", "BOT_TOKEN")
CHAT_KEYS = ("TELEGRAM_CHAT_ID", "TELEGRAM_CHAT", "CHAT_ID")


def parse_env_file(path: str) -> dict:
    """Minimal .env parser: KEY=value, optional `export`, # comments, quotes."""
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
                # strip surrounding matching quotes
                if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
                    val = val[1:-1]
                if key:
                    out[key] = val
    except FileNotFoundError:
        pass
    return out


def load_env(env_dir: str) -> dict:
    """Layer files lowest-priority first, then real process env wins.

    Order: ~/.env -> ~/.env.local -> <env_dir>/.env -> <env_dir>/.env.local.
    So the invocation dir overrides the global ~/ fallback, and .local overrides
    its sibling .env. A real exported env var beats all files.
    """
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
        # dedupe when env_dir is home (same path appears twice); order preserved
        real = os.path.abspath(path)
        if real in seen:
            continue
        seen.add(real)
        merged.update(parse_env_file(path))
    # process environment wins (lets callers override without editing files)
    for k, v in os.environ.items():
        merged[k] = v
    return merged


def pick(env: dict, keys) -> str | None:
    for k in keys:
        v = env.get(k)
        if v:
            return v
    return None


def send_telegram(token: str, chat_id: str, text: str, parse_mode: str | None) -> dict:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    fields = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": "true",
    }
    if parse_mode:
        fields["parse_mode"] = parse_mode
    payload = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        # Telegram returns a JSON body even on 4xx — surface it.
        try:
            return json.loads(e.read())
        except Exception:
            return {"ok": False, "error_code": e.code, "description": str(e)}


def main():
    p = argparse.ArgumentParser(description="Send an arbitrary message to Telegram.")
    p.add_argument("--text", help="Message text. If omitted, read from stdin.")
    p.add_argument("--env-dir", default=os.getcwd(),
                   help="Directory holding .env / .env.local (default: cwd).")
    p.add_argument("--token", help="Override bot token (else from env/.env).")
    p.add_argument("--chat-id", help="Override chat ID (else from env/.env).")
    p.add_argument("--parse-mode", choices=["HTML", "MarkdownV2", "Markdown"],
                   help="Telegram parse mode. Omit for plain text (safest).")
    args = p.parse_args()

    text = args.text if args.text is not None else sys.stdin.read()
    if not text.strip():
        print("Error: no message text (pass --text or pipe via stdin).", file=sys.stderr)
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

    body = send_telegram(token, chat_id, text, args.parse_mode)
    if not body.get("ok"):
        print(f"Telegram error: {body}", file=sys.stderr)
        sys.exit(1)
    print(f"✓ Sent to chat {chat_id} (message_id {body['result'].get('message_id')}).")


if __name__ == "__main__":
    main()
