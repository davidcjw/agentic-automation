---
name: send-telegram
description: Send arbitrary text or images to the user's Telegram chat via a bot. Reads the bot token and chat ID from a .env or .env.local file in the directory the skill is invoked from. Use when the user wants to send/push a message, note, alert, result, image, screenshot, or notification to Telegram, says "send this to my telegram", "telegram me", "ping me on telegram", or "notify me on telegram".
---

# Send to Telegram

Sends an arbitrary message to the user's Telegram chat using the Telegram Bot API.

## Credentials

Both values are read from a `.env` or `.env.local` file. The skill looks in the
**invocation directory** first, falling back to a **global** `~/.env` / `~/.env.local`.

Precedence (highest wins):

1. A real exported process env var
2. `<cwd>/.env.local`
3. `<cwd>/.env`
4. `~/.env.local`
5. `~/.env`

So a local project file overrides your global home-dir fallback, and `.env.local`
overrides its sibling `.env`.

| Value | Variable (first match wins) |
|-------|-----------------------------|
| Bot token | `TELEGRAM_BOT_TOKEN`, then `TELEGRAM_TOKEN`, then `BOT_TOKEN` |
| Chat ID | `TELEGRAM_CHAT_ID`, then `TELEGRAM_CHAT`, then `CHAT_ID` |

Example `.env`:

```
TELEGRAM_BOT_TOKEN=123456789:AAExampleBotTokenStringHere
TELEGRAM_CHAT_ID=987654321
```

> Sending requires **both** a bot token and a chat ID. The user mentioned only the
> chat ID, so this skill assumes the token lives in the same `.env`/`.env.local`.
> If the script reports a missing token, ask the user where it is (or pass `--token`).

## Sending a text message

Message text comes from `--text`, or from **stdin** if `--text` is omitted (so you
can pipe multi-line / arbitrary input). Run from the directory containing the `.env`:

```bash
# inline text
python3 ~/.claude/skills/send-telegram/scripts/send.py --text "Build finished ✅"

# pipe arbitrary input (preserves newlines, special chars)
some-command | python3 ~/.claude/skills/send-telegram/scripts/send.py

# point at a different .env location
python3 ~/.claude/skills/send-telegram/scripts/send.py \
  --text "hi" --env-dir /path/to/project
```

### Options

| Flag | Purpose |
|------|---------|
| `--text <s>` | Message body. Omit to read from stdin. |
| `--env-dir <dir>` | Where to find `.env` / `.env.local` (default: cwd). |
| `--token <s>` | Override the bot token (else from env / `.env`). |
| `--chat-id <s>` | Override the chat ID (else from env / `.env`). |
| `--parse-mode <m>` | `HTML`, `MarkdownV2`, or `Markdown`. Omit for plain text (safest — no escaping pitfalls with arbitrary input). |

## Sending an image

Use `send_photo.py` to upload a local image file (PNG, JPG, etc.) via Telegram's
`sendPhoto` API. Pass the image path as a positional argument:

```bash
# send an image with no caption
python3 ~/.claude/skills/send-telegram/scripts/send_photo.py /path/to/image.png

# send with a caption
python3 ~/.claude/skills/send-telegram/scripts/send_photo.py /path/to/image.png \
  --caption "Daily report 📊"

# point at a different .env location
python3 ~/.claude/skills/send-telegram/scripts/send_photo.py /path/to/image.png \
  --caption "Chart" --env-dir /path/to/project
```

### Options

| Flag | Purpose |
|------|---------|
| `image` | (positional) Path to the local image file to send. |
| `--caption <s>` | Optional caption text shown below the image. |
| `--env-dir <dir>` | Where to find `.env` / `.env.local` (default: cwd). |
| `--token <s>` | Override the bot token (else from env / `.env`). |
| `--chat-id <s>` | Override the chat ID (else from env / `.env`). |

Telegram's file-size limit for photos sent via `sendPhoto` is **10 MB**. For larger
files use `sendDocument` instead (not yet implemented here).

## Notes

- Both scripts are stdlib-only (no `pip install`). Requires Python 3.
- On success each script prints the sent `message_id`; on failure it prints Telegram's
  error JSON and exits non-zero.
- Plain text is the default for `send.py`. Only pass `--parse-mode` when the message
  is known-good HTML/Markdown; otherwise Telegram may reject unescaped special characters.
