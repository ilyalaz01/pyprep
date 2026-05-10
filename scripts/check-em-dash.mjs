#!/usr/bin/env node
/**
 * Em-dash content lint (T4.5.4).
 *
 * Shared impeccable Copy law: no em dashes (U+2014). Greps the
 * frontend src/ tree for em dashes inside string literals + JSX text.
 * Code comments and JSDoc are exempt — those don't reach the user.
 *
 * Run: `node scripts/check-em-dash.mjs`. Exits 1 on any hit. Wired
 * into pre-push + CI alongside check-contrast.mjs.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', 'frontend', 'src')

const SKIP_DIRS = new Set(['node_modules', 'dist', 'test', '__snapshots__'])
const EXTS = new Set(['.ts', '.tsx'])

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    // Skip test files — describe()/test() labels aren't shipped copy.
    else if (EXTS.has(p.slice(p.lastIndexOf('.'))) && !p.includes('.test.')) {
      out.push(p)
    }
  }
  return out
}

/**
 * Strip block + line comments. We keep strings intact because that's
 * exactly where user-facing copy lives. JSX text between tags also
 * survives, since it isn't recognized as a comment.
 */
function stripComments(src) {
  // Block comments. Lazy match.
  let s = src.replace(/\/\*[\s\S]*?\*\//g, '')
  // Line comments (start of line OR after whitespace, until newline).
  // Avoid matching `//` inside string literals by skipping when an
  // odd number of unescaped quotes precedes on the same line.
  s = s.split('\n').map((line) => {
    const idx = findLineCommentStart(line)
    return idx >= 0 ? line.slice(0, idx) : line
  }).join('\n')
  return s
}

function findLineCommentStart(line) {
  let inS = false
  let inD = false
  let inT = false
  for (let i = 0; i < line.length - 1; i++) {
    const c = line[i]
    const n = line[i + 1]
    if (c === '\\') { i++; continue }
    if (!inD && !inT && c === "'") inS = !inS
    else if (!inS && !inT && c === '"') inD = !inD
    else if (!inS && !inD && c === '`') inT = !inT
    else if (!inS && !inD && !inT && c === '/' && n === '/') return i
  }
  return -1
}

const files = walk(root)
const hits = []
for (const f of files) {
  const src = stripComments(readFileSync(f, 'utf8'))
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('—')) {
      hits.push({ file: relative(join(here, '..'), f), line: i + 1, text: lines[i].trim() })
    }
  }
}

if (hits.length > 0) {
  console.error('Em dashes (U+2014) found in user-facing copy:\n')
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  ${h.text}`)
  }
  console.error(
    '\nShared impeccable Copy law: use commas, colons, semicolons, periods, or parentheses.',
  )
  process.exit(1)
}
console.log(`No em dashes in ${files.length} user-facing source files.`)
