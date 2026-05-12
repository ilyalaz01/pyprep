/**
 * Shiki highlighter — single shared instance, lazy-initialized on first
 * use (typically when the user opens a lesson with code blocks).
 *
 * Built from `shiki/core` with explicit language/theme/engine imports,
 * NOT the default `shiki` entry. The default entry pulls every
 * BundledLanguage as separately-chunked dynamic imports, and Vite's
 * lazy graph keeps every chunk in dist/ even when only python/json/
 * bash are reachable from app code — see ADR-022 (T6.11) and
 * `scripts/check-bundle-size.mjs`. With this core form only the
 * langs/theme we name below ship.
 *
 * Engine: `createJavaScriptRegexEngine`, not Oniguruma. The JS engine
 * handles the four langs we register (python/json/bash/text), avoids
 * the 280 KB onig.wasm download on first highlight, and works in
 * worker + main-thread contexts without WASM-mime-type CDN fiddling.
 *
 * Theme: github-dark-dimmed (restrained, anti-VSCode-dark-plus). If a
 * future polish wants tokens mapped to DESIGN.md instead, swap to a
 * custom Theme JSON here.
 */
import type { HighlighterCore } from 'shiki/core'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

export const SUPPORTED_LANGS = ['python', 'json', 'bash', 'text'] as const
export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

let highlighterPromise: Promise<HighlighterCore> | null = null

export async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import('shiki/themes/github-dark-dimmed.mjs')],
      langs: [
        import('shiki/langs/python.mjs'),
        import('shiki/langs/json.mjs'),
        import('shiki/langs/bash.mjs'),
      ],
      engine: createJavaScriptRegexEngine(),
    })
  }
  return highlighterPromise
}

export function normalizeLang(raw: string | undefined): SupportedLang {
  if (!raw) return 'text'
  const normalized = raw.toLowerCase()
  if (normalized === 'py' || normalized === 'python3') return 'python'
  if (normalized === 'sh' || normalized === 'shell') return 'bash'
  return (SUPPORTED_LANGS as readonly string[]).includes(normalized)
    ? (normalized as SupportedLang)
    : 'text'
}
