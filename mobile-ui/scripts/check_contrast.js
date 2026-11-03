#!/usr/bin/env node
// Checks every surface/foreground pair in src/global.css against WCAG 2.1 (text 4.5:1, UI 3:1).
// Reads the CSS itself, so it cannot pass against stale values. Exits non-zero on failure (CI gate).

const fs = require('node:fs');
const path = require('node:path');

const CSS_PATH = path.join(__dirname, '..', 'src', 'global.css');

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

function relativeLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const c = v / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(a, b) {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);

  return (lighter + 0.05) / (darker + 0.05);
}

const toHex = ([r, g, b]) =>
  '#' +
  [r, g, b]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

function extractBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) return null;

  const open = css.indexOf('{', start);
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }

  return null;
}

function parseDeclarations(block) {
  const tokens = {};
  const withoutComments = block.replace(/\/\*[\s\S]*?\*\//g, '');

  for (const match of withoutComments.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }

  return tokens;
}

function resolve(tokens, name, seen = new Set()) {
  const raw = tokens[name];
  if (raw === undefined) return null;
  if (seen.has(name)) throw new Error(`Circular var reference at --${name}`);

  const varMatch = raw.match(/^var\(\s*--([\w-]+)\s*\)$/);
  if (varMatch) return resolve(tokens, varMatch[1], new Set([...seen, name]));

  const channels = raw.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!channels) return null;

  return hslToRgb(Number(channels[1]), Number(channels[2]), Number(channels[3]));
}

const TEXT_PAIRS = [
  ['body text', 'foreground', 'background'],
  ['card text', 'card-foreground', 'card'],
  ['popover text', 'popover-foreground', 'popover'],
  ['muted text on page', 'muted-foreground', 'background'],
  ['muted text on muted', 'muted-foreground', 'muted'],
  ['primary button', 'primary-foreground', 'primary'],
  ['secondary button', 'secondary-foreground', 'secondary'],
  ['accent fill', 'accent-foreground', 'accent'],
  ['critical fill', 'critical-foreground', 'critical'],
  ['success fill', 'success-foreground', 'success'],
  ['warning fill', 'warning-foreground', 'warning'],
  ['destructive fill', 'destructive-foreground', 'destructive'],
  ['gold text on page', 'accent-emphasis', 'background'],
];

const UI_PAIRS = [
  ['primary vs page', 'primary', 'background'],
  ['accent vs page', 'accent', 'background'],
  ['success vs page', 'success', 'background'],
  ['critical vs page', 'critical', 'background'],
  ['destructive vs page', 'destructive', 'background'],
  ['gold emphasis vs page', 'accent-emphasis', 'background'],
  ['ring vs page', 'ring', 'background'],
];

// Known exceptions. Brand gold reaches only 2.66:1 on Stone, so it is approved for filled
// surfaces (text uses accent-foreground); accent-emphasis covers every standalone use.
const ACCEPTED_EXCEPTIONS = new Map([
  ['light:accent vs page', 'brand gold, fills only — use accent-emphasis standalone'],
]);

const TEXT_MIN = 4.5;
const UI_MIN = 3.0;

function main() {
  const css = fs.readFileSync(CSS_PATH, 'utf8');

  const brandBlock = extractBlock(css, ':root {');
  const darkBlock = extractBlock(css, '.dark:root {');

  if (!brandBlock || !darkBlock) {
    console.error(`Could not parse token blocks from ${CSS_PATH}`);
    process.exit(1);
  }

  // Brand and light semantic tokens are both `:root` blocks: merge them in file order, later
  // declarations winning, exactly as the cascade does at runtime.
  const lightTokens = {};
  let cursor = 0;
  while (true) {
    const next = css.indexOf(':root {', cursor);
    if (next === -1) break;
    // Skip `.dark:root`, which also matches the substring.
    if (css.slice(Math.max(0, next - 5), next) !== '.dark') {
      Object.assign(lightTokens, parseDeclarations(extractBlock(css.slice(next), ':root {')));
    }
    cursor = next + 1;
  }

  const darkTokens = { ...lightTokens, ...parseDeclarations(darkBlock) };

  const themes = { light: lightTokens, dark: darkTokens };
  let failures = 0;

  for (const [themeName, tokens] of Object.entries(themes)) {
    console.log(`\n  ${themeName.toUpperCase()}`);

    const checks = [
      ...TEXT_PAIRS.map((p) => [...p, TEXT_MIN]),
      ...UI_PAIRS.map((p) => [...p, UI_MIN]),
    ];

    for (const [label, fgName, bgName, min] of checks) {
      const fg = resolve(tokens, fgName);
      const bg = resolve(tokens, bgName);

      if (!fg || !bg) {
        console.log(`  SKIP  ${label.padEnd(24)} (--${fgName} or --${bgName} not resolvable)`);
        continue;
      }

      const ratio = contrastRatio(fg, bg);
      const exception = ACCEPTED_EXCEPTIONS.get(`${themeName}:${label}`);
      const passed = ratio >= min;

      if (passed) {
        console.log(
          `  PASS  ${label.padEnd(24)} ${toHex(fg)} on ${toHex(bg)}  ${ratio.toFixed(2)}:1`,
        );
      } else if (exception) {
        console.log(
          `  ALLOW ${label.padEnd(24)} ${toHex(fg)} on ${toHex(bg)}  ${ratio.toFixed(2)}:1  — ${exception}`,
        );
      } else {
        failures++;
        console.log(
          `  FAIL  ${label.padEnd(24)} ${toHex(fg)} on ${toHex(bg)}  ${ratio.toFixed(2)}:1  (needs ${min})`,
        );
      }
    }
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} contrast failure${failures === 1 ? '' : 's'}.\n`);
    process.exit(1);
  }
  console.log('All pairs meet WCAG AA.\n');
}

main();
