/**
 * Shiki highlighter — single shared instance, lazy-initialized on first
 * use (typically when the user opens a lesson with code blocks). Only
 * Python, JSON, bash, and plain text are bundled — keeps the WASM +
 * grammar payload to ~150 KB rather than the multi-MB default.
 *
 * Theme: github-dark-dimmed (restrained, anti-VSCode-dark-plus). If a
 * future polish wants tokens mapped to DESIGN.md instead, swap to a
 * custom Theme JSON here.
 */
import type { HighlighterCore, BundledLanguage } from 'shiki'

export const SUPPORTED_LANGS = ['python', 'json', 'bash', 'text'] as const
export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

let highlighterPromise: Promise<HighlighterCore> | null = null

export async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then((m) =>
      m.createHighlighter({
        themes: ['github-dark-dimmed'],
        langs: SUPPORTED_LANGS as unknown as BundledLanguage[],
      }),
    )
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
