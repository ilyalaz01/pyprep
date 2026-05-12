#!/usr/bin/env node
/**
 * Bundle-size pre-push gate (T6.11).
 *
 * Walks `frontend/dist/` and sums raw + gzipped bytes across all
 * shippable assets (.js, .css, .html, .svg, .wasm, .json). Hard fail
 * if either total exceeds its ceiling.
 *
 * Ceilings — locked by ADR-022 (T6.11):
 *   RAW:  2,097,152 bytes  (2 MB)
 *   GZIP:   614,400 bytes  (600 KB)
 *
 * Rationale: Phase 5 close (commit `0240673`) had the lesson page
 * pulling shiki's full lang bundle (~10 MB raw). T6.11.0 polish
 * dropped it back to the 4 langs we actually highlight. The gate
 * prevents that regression from sneaking back in.
 *
 * Requires `frontend/dist/` to exist. Build first or the script
 * exits with an instruction message (CI build step runs before
 * this gate; pre-push runs `pnpm --dir frontend build` ahead of
 * this hook).
 *
 * Exit codes: 0 ok · 1 over ceiling · 2 dist missing.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, '..', 'frontend', 'dist')

const RAW_CEILING = 2 * 1024 * 1024
const GZIP_CEILING = 600 * 1024
const SHIPPABLE = new Set(['.js', '.css', '.html', '.svg', '.wasm', '.json'])

if (!existsSync(dist)) {
  console.error(
    `bundle gate: ${relative(process.cwd(), dist)} not found.\n` +
      `Run \`pnpm --dir frontend build\` first.`,
  )
  process.exit(2)
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else if (SHIPPABLE.has(p.slice(p.lastIndexOf('.')))) out.push(p)
  }
  return out
}

const files = walk(dist)
let rawTotal = 0
let gzipTotal = 0
const perFile = []
for (const f of files) {
  const buf = readFileSync(f)
  const gz = gzipSync(buf)
  rawTotal += buf.length
  gzipTotal += gz.length
  perFile.push({ f, raw: buf.length, gzip: gz.length })
}

function fmt(n) {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB'
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB'
  return n + ' B'
}

const overRaw = rawTotal > RAW_CEILING
const overGz = gzipTotal > GZIP_CEILING

console.log(
  `bundle: ${files.length} files · raw ${fmt(rawTotal)} / ${fmt(RAW_CEILING)} · gzip ${fmt(gzipTotal)} / ${fmt(GZIP_CEILING)}`,
)

if (overRaw || overGz) {
  console.error('\nOVER CEILING. Largest contributors:')
  perFile.sort((a, b) => b.raw - a.raw)
  for (const { f, raw, gzip } of perFile.slice(0, 10)) {
    console.error(
      `  ${relative(join(here, '..'), f)}  raw ${fmt(raw)}  gzip ${fmt(gzip)}`,
    )
  }
  console.error(
    '\nIf the regression is intentional, raise the ceiling in this script\n' +
      'AND document the new budget in PLAN.md ADR-022.',
  )
  process.exit(1)
}
