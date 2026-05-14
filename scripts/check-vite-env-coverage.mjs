#!/usr/bin/env node
/**
 * Vite env-var coverage gate (NOTES N038).
 *
 * Ensures the documented VITE_* surface in `.env-example` matches what
 * `frontend/src/` actually references. Fails on either direction:
 *   - used-but-undocumented: code reads a VITE_FOO never declared in
 *     .env-example, so a fresh-clone developer hits "undefined" at runtime.
 *   - documented-but-unused: .env-example lists VITE_FOO no code reads,
 *     so the env var is dead documentation that misleads new contributors
 *     and drifts further with every refactor.
 *
 * Vite inlines VITE_* env vars at build time (worker.ts:127 reminder).
 * Build-time-only "documentation" vars without a runtime consumer are
 * caught here too — they should either be wired into code or removed.
 *
 * Run: `node scripts/check-vite-env-coverage.mjs`. Exits 1 on any drift.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const srcRoot = join(repoRoot, 'frontend', 'src')
const envExample = join(repoRoot, '.env-example')

const SKIP_DIRS = new Set(['node_modules', 'dist', '__snapshots__'])
const EXTS = new Set(['.ts', '.tsx'])
const VITE_NAME = /\bVITE_[A-Z0-9_]+\b/g
const ENV_LINE = /^(VITE_[A-Z0-9_]+)=/

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else if (EXTS.has(p.slice(p.lastIndexOf('.')))) out.push(p)
  }
  return out
}

function usedVars() {
  const found = new Set()
  for (const f of walk(srcRoot)) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(VITE_NAME)) found.add(m[0])
  }
  return found
}

function documentedVars() {
  const found = new Set()
  for (const line of readFileSync(envExample, 'utf8').split('\n')) {
    const m = line.match(ENV_LINE)
    if (m) found.add(m[1])
  }
  return found
}

const used = usedVars()
const documented = documentedVars()
const undocumented = [...used].filter((v) => !documented.has(v)).sort()
const unused = [...documented].filter((v) => !used.has(v)).sort()

if (undocumented.length === 0 && unused.length === 0) {
  console.log(
    `Vite env coverage OK: ${used.size} VITE_* in frontend/src/ all documented in .env-example.`,
  )
  process.exit(0)
}

console.error('Vite env-var coverage gate failed (N038):\n')
if (undocumented.length > 0) {
  console.error('  used in frontend/src/ but NOT documented in .env-example:')
  for (const v of undocumented) console.error(`    - ${v}`)
}
if (unused.length > 0) {
  console.error('  declared in .env-example but NOT used in frontend/src/:')
  for (const v of unused) console.error(`    - ${v}`)
}
console.error(
  '\nFix: add the var to .env-example, OR remove it from .env-example, OR wire it into frontend/src/.',
)
process.exit(1)
