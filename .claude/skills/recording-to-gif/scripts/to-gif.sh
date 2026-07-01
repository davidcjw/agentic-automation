#!/usr/bin/env bash
# Convert a screen recording (.mp4/.mov/.webm/.m4v/.mkv) to an optimized .gif.
# Two-pass ffmpeg (palettegen + paletteuse) for clean colors at small size.
#
# Usage: to-gif.sh <input> [output.gif] [width] [fps]
#   input    required — path to the source video
#   output   default: <input dir>/<input name>.gif
#   width    default: 720 (px; height auto, aspect preserved)
#   fps      default: 15
set -euo pipefail

INPUT="${1:-}"
OUTPUT="${2:-}"
WIDTH="${3:-720}"
FPS="${4:-15}"

if [[ -z "$INPUT" ]]; then
  echo "usage: to-gif.sh <input-video> [output.gif] [width=720] [fps=15]" >&2
  exit 2
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "error: ffmpeg not found. Install it (macOS: brew install ffmpeg)." >&2
  exit 3
fi
if [[ ! -f "$INPUT" ]]; then
  echo "error: input not found: $INPUT" >&2
  exit 4
fi

# default output: same dir/name as input, .gif extension
if [[ -z "$OUTPUT" ]]; then
  OUTPUT="${INPUT%.*}.gif"
fi

# reject audio-only files (e.g. .m4a) — a GIF needs a video stream
if command -v ffprobe >/dev/null 2>&1; then
  if ! ffprobe -v error -select_streams v:0 -show_entries stream=codec_type \
       -of csv=p=0 "$INPUT" 2>/dev/null | grep -q video; then
    echo "error: '$INPUT' has no video stream (audio-only files like .m4a cannot become a GIF)." >&2
    exit 5
  fi
fi

mkdir -p "$(dirname "$OUTPUT")"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
PALETTE="$WORK/palette.png"

FILTERS="fps=${FPS},scale=${WIDTH}:-1:flags=lanczos"

# pass 1: build an optimal 256-color palette from the whole clip
ffmpeg -hide_banner -loglevel error -y -i "$INPUT" \
  -vf "${FILTERS},palettegen=stats_mode=diff" "$PALETTE"

# pass 2: render the gif using that palette
ffmpeg -hide_banner -loglevel error -y -i "$INPUT" -i "$PALETTE" \
  -lavfi "${FILTERS} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
  "$OUTPUT"

SIZE="$(du -h "$OUTPUT" | cut -f1 | tr -d ' ')"
echo "wrote $OUTPUT (${SIZE}, ${WIDTH}px, ${FPS}fps)"
