#!/usr/bin/env node
/**
 * extract-tokens.mjs — walk a live page's computed styles and dump a ranked
 * design-token distribution as JSON. This is the deterministic first step of
 * the url-to-design-system skill.
 *
 * Usage:
 *   npm i -D playwright            # once, anywhere on PATH, or use npx
 *   node extract-tokens.mjs <url> [--full-page-screenshot out.png] > tokens.json
 *
 * No Playwright install? Paste the body of `extractFn` below into the
 * Playwright MCP `browser_evaluate` instead — it is a self-contained
 * browser-side function returning the same JSON.
 *
 * Output shape:
 *   { url, viewport, palette:{text,background,border}, typography, borders,
 *     radii, spacing:{module,raw}, shadows, sampleCount }
 * Each ranked list is [{value, count}] sorted by frequency (most common first).
 */

const url = process.argv[2];
if (!url) {
  console.error('usage: node extract-tokens.mjs <url> [--full-page-screenshot out.png]');
  process.exit(1);
}
const shotIdx = process.argv.indexOf('--full-page-screenshot');
const shotPath = shotIdx > -1 ? process.argv[shotIdx + 1] : null;

// ---- browser-side extractor (also pasteable into browser_evaluate) ----------
const extractFn = () => {
  const tally = (m, k) => { if (k == null || k === '') return; m.set(k, (m.get(k) || 0) + 1); };
  const rank = (m, n = 24) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n) : null; };

  const text = new Map(), bg = new Map(), bordC = new Map();
  const fontFam = new Map(), fontSize = new Map(), fontWeight = new Map(), lineH = new Map(), letterSp = new Map();
  const bordW = new Map(), bordStyle = new Map(), radius = new Map(), shadow = new Map();
  const space = new Map(); // margins/paddings/gaps -> rhythm

  const TRANSPARENT = new Set(['rgba(0, 0, 0, 0)', 'transparent', 'rgb(0, 0, 0)']);
  const els = document.querySelectorAll('*');
  let sampleCount = 0;

  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;        // skip invisible
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return;
    sampleCount++;

    const hasText = el.childNodes && [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (hasText) {
      tally(text, s.color);
      tally(fontFam, s.fontFamily);
      tally(fontSize, px(s.fontSize) + 'px');
      tally(fontWeight, s.fontWeight);
      tally(lineH, s.lineHeight);
      tally(letterSp, s.letterSpacing);
    }
    if (!TRANSPARENT.has(s.backgroundColor)) tally(bg, s.backgroundColor);

    if (s.borderTopWidth !== '0px' && s.borderTopStyle !== 'none') {
      tally(bordC, s.borderTopColor);
      tally(bordW, s.borderTopWidth);
      tally(bordStyle, s.borderTopStyle);
    }
    if (s.borderTopLeftRadius !== '0px') tally(radius, s.borderTopLeftRadius);
    if (s.boxShadow && s.boxShadow !== 'none') tally(shadow, s.boxShadow);

    [s.marginTop, s.marginBottom, s.paddingTop, s.paddingBottom, s.paddingLeft, s.paddingRight,
     s.rowGap, s.columnGap].forEach((v) => { const n = px(v); if (n && n > 0) tally(space, n + 'px'); });
  });

  // crude module guess: most common positive spacing value (the rhythm unit)
  const spaceRanked = rank(space, 20);
  const module = spaceRanked.length ? spaceRanked[0].value : null;

  return {
    url: location.href,
    viewport: { width: innerWidth, height: innerHeight },
    sampleCount,
    palette: { text: rank(text), background: rank(bg), border: rank(bordC) },
    typography: {
      fontFamily: rank(fontFam, 8),
      fontSize: rank(fontSize),
      fontWeight: rank(fontWeight, 8),
      lineHeight: rank(lineH, 10),
      letterSpacing: rank(letterSp, 10),
    },
    borders: { width: rank(bordW, 8), style: rank(bordStyle, 6) },
    radii: rank(radius, 10),
    shadows: rank(shadow, 8),
    spacing: { module, raw: spaceRanked },
  };
};

// ---- node driver ------------------------------------------------------------
const { chromium } = await import('playwright').catch(() => {
  console.error('playwright not found. Run `npm i -D playwright` (or `npx playwright install chromium`), '
    + 'or paste extractFn into the Playwright MCP browser_evaluate.');
  process.exit(1);
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500); // let fonts/animations settle
const result = await page.evaluate(extractFn);
if (shotPath) await page.screenshot({ path: shotPath, fullPage: true });
await browser.close();

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
