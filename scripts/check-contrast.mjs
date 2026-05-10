#!/usr/bin/env node
/**
 * WCAG AA contrast gate for theme tokens (T4.5.1).
 *
 * Parses OKLCH values out of frontend/src/index.css for both the dark
 * default and the prefers-color-scheme: light override. Converts each
 * via OKLCH → OKLab → linear sRGB → WCAG relative luminance, then
 * asserts the documented foreground/background pairings clear AA
 * (4.5:1 for normal text; we treat all our muted/subtle text as
 * normal because text-xs is small).
 *
 * Run: `node scripts/check-contrast.mjs`. Exits 1 on any pairing
 * below threshold. Wired into the pre-push hook + CI alongside
 * ruff/mypy/eslint.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const cssPath = join(here, '..', 'frontend', 'src', 'index.css')
const css = readFileSync(cssPath, 'utf8')

const AA_NORMAL = 4.5

const PAIRINGS = [
  // foreground token, background token
  ['--color-fg', '--color-bg'],
  ['--color-fg', '--color-bg-elevated'],
  ['--color-fg-muted', '--color-bg'],
  ['--color-fg-muted', '--color-bg-elevated'],
  ['--color-fg-subtle', '--color-bg'],
  ['--color-fg-subtle', '--color-bg-elevated'],
]

function parseTokens(scope) {
  // scope is the CSS text of the @theme block (dark default) or the
  // light-override :root block. We pull `--name: oklch(L C H);` only.
  const out = {}
  const re = /(--color-[a-z0-9-]+):\s*oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/g
  let m
  while ((m = re.exec(scope)) !== null) {
    out[m[1]] = { L: +m[2], C: +m[3], H: +m[4] }
  }
  return out
}

function sliceBlock(source, header) {
  const start = source.indexOf(header)
  if (start === -1) throw new Error(`block not found: ${header}`)
  let depth = 0
  let i = start + header.length
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  throw new Error(`unterminated block: ${header}`)
}

const darkText = sliceBlock(css, '@theme')
const lightWrap = sliceBlock(css, '@media (prefers-color-scheme: light)')
const lightText = sliceBlock(lightWrap, ':root')

const dark = parseTokens(darkText)
const light = { ...dark, ...parseTokens(lightText) }

// OKLCH → OKLab
function oklchToLab({ L, C, H }) {
  const h = (H * Math.PI) / 180
  return { L, a: C * Math.cos(h), b: C * Math.sin(h) }
}

// OKLab → linear sRGB (Björn Ottosson's matrix)
function labToLinearRgb({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  }
}

// Linear sRGB → WCAG relative luminance
function relLuminance({ r, g, b }) {
  const clamp = (x) => Math.max(0, Math.min(1, x))
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b)
}

function contrast(fg, bg) {
  const L1 = relLuminance(labToLinearRgb(oklchToLab(fg)))
  const L2 = relLuminance(labToLinearRgb(oklchToLab(bg)))
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (hi + 0.05) / (lo + 0.05)
}

function check(label, tokens) {
  console.log(`\n${label}`)
  let failed = 0
  for (const [fg, bg] of PAIRINGS) {
    const fgT = tokens[fg]
    const bgT = tokens[bg]
    if (!fgT || !bgT) {
      console.log(`  ✗ ${fg} on ${bg} — token missing`)
      failed++
      continue
    }
    const ratio = contrast(fgT, bgT)
    const ok = ratio >= AA_NORMAL
    const mark = ok ? '✓' : '✗'
    console.log(`  ${mark} ${fg} on ${bg} = ${ratio.toFixed(2)}:1 (need ≥${AA_NORMAL})`)
    if (!ok) failed++
  }
  return failed
}

const failures = check('Dark theme (default @theme)', dark) +
  check('Light theme (@media prefers-color-scheme: light)', light)

if (failures > 0) {
  console.error(`\n${failures} pairing(s) below WCAG AA. Adjust token L value.`)
  process.exit(1)
}
console.log('\nAll pairings pass WCAG AA.')
