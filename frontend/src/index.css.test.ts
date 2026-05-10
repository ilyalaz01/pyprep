/**
 * Lint-style assertions on src/index.css. We can't render WebKit scrollbar
 * pseudo-elements in jsdom, so we pin the declarations textually — same
 * spirit as the variant-token tests on Button/Input.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, 'index.css'), 'utf8')

function block(selector: string): string {
  // Grab the `selector { ... }` body. Selectors here are unique in the file.
  const re = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`,
  )
  const m = css.match(re)
  if (!m) throw new Error(`selector not found in index.css: ${selector}`)
  return m[1]
}

describe('index.css — .prose pre scrollbar (T4.7.1b)', () => {
  test('horizontal scrollbar is 8px tall (overflow-x: auto on .prose pre)', () => {
    expect(block('.prose pre::-webkit-scrollbar')).toMatch(/height:\s*8px/)
  })

  test('scrollbar track is transparent (no bright WebKit default)', () => {
    expect(block('.prose pre::-webkit-scrollbar-track')).toMatch(
      /background:\s*transparent/,
    )
  })

  test('scrollbar thumb uses --color-fg-muted at low opacity', () => {
    const thumb = block('.prose pre::-webkit-scrollbar-thumb')
    expect(thumb).toMatch(/--color-fg-muted/)
    // low-opacity via color-mix (keeps the thumb visible without shouting)
    expect(thumb).toMatch(/color-mix/)
  })
})
