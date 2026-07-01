---
name: recording-to-gif
description: Convert a screen recording (.mp4 / .mov / .webm / .m4v / .mkv) into an optimized .gif using ffmpeg (two-pass palette for clean colors at small size). Use when the user wants to turn a screen recording or video into a GIF, create or refresh a demo.gif for a README, or when the opensource-readme skill needs a demo GIF and a recording exists.
---

# Recording → GIF

Convert a screen recording into a small, clean `.gif`. Wraps ffmpeg with a
two-pass palette so colors stay crisp and file size stays reasonable.

## Quick start

```bash
bash scripts/to-gif.sh <input-video> [output.gif] [width=720] [fps=15]
```

Examples:

```bash
# explicit output
bash scripts/to-gif.sh ~/Desktop/recording.mov docs/demo.gif

# defaults: writes next to the input as recording.gif, 720px, 15fps
bash scripts/to-gif.sh ~/Desktop/recording.mov
```

The script prints the output path and size on success. It exits non-zero with a
clear message if ffmpeg is missing, the input doesn't exist, or the file is
audio-only (e.g. `.m4a` — no video stream to turn into a GIF).

## Finding a recording

When the user doesn't give an explicit path, locate the most likely recording,
then **tell them which file you picked** before/after converting:

1. **In the repo** — `*.mov *.mp4 *.webm *.m4v *.mkv` in the repo root and under
   `docs/`, `assets/`, `media/`, `.github/`, `public/`, `screenshots/`.
2. **macOS screen recordings** — `~/Desktop` (default save location; named like
   `Screen Recording YYYY-MM-DD at ….mov`), then `~/Movies`.

Pick the **most recently modified** match. If several are plausible or the choice
is ambiguous, list the candidates and ask which one. Never guess silently.

```bash
# newest video under the repo
find . -type f \( -iname '*.mov' -o -iname '*.mp4' -o -iname '*.webm' -o -iname '*.m4v' -o -iname '*.mkv' \) \
  -not -path '*/node_modules/*' -print0 | xargs -0 ls -t 2>/dev/null | head

# newest macOS screen recording on the Desktop
ls -t ~/Desktop/*.mov ~/Desktop/Screen\ Recording* 2>/dev/null | head
```

## Output conventions

- For a README demo, output to **`docs/demo.gif`** in the repo (what
  `opensource-readme` expects). Create `docs/` if needed (the script does this).
- Default width **720px** reads well on GitHub; drop to 600 for a narrower clip.
- If the gif is too large (GitHub inlines fine up to ~10MB but smaller is
  better), re-run with a lower `width` (e.g. 600) or `fps` (e.g. 12).

## Tuning

| arg | default | when to change |
| --- | --- | --- |
| width | 720 | smaller (600) to shrink file size; larger only if detail is lost |
| fps | 15 | 10–12 for talking-head/slow demos; 20–24 for fast motion |

## Use within opensource-readme

The `opensource-readme` skill calls this during its **Demo GIF** step: if a
screen recording exists and there's no demo GIF yet, convert it to
`docs/demo.gif` and embed it. If **no** recording exists, skip — leave the
placeholder and tell the user where to drop one. Never fabricate a demo.
