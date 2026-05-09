/**
 * ShikiCodeBlock — renders highlighted HTML asynchronously. Until shiki
 * loads, falls back to a plain mono-font <pre><code> so the user sees
 * legible code immediately (no flash of empty content).
 *
 * `dangerouslySetInnerHTML` is safe here: input is markdown-derived
 * code text the SPA already trusts (it's lesson content from our own
 * /api/modules endpoint), and shiki's output is structured HTML with
 * no script vector.
 */
import { useEffect, useState } from 'react'

import { getHighlighter, normalizeLang } from '../lib/shiki'

interface ShikiCodeBlockProps {
  code: string
  lang: string
}

export function ShikiCodeBlock({ code, lang }: ShikiCodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null)
  const normalized = normalizeLang(lang)

  useEffect(() => {
    let cancelled = false
    getHighlighter().then((h) => {
      if (cancelled) return
      const out = h.codeToHtml(code, { lang: normalized, theme: 'github-dark-dimmed' })
      setHtml(out)
    })
    return () => {
      cancelled = true
    }
  }, [code, normalized])

  if (html) {
    return (
      <div
        data-lang={normalized}
        data-shiki="true"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <pre data-lang={normalized}>
      <code>{code}</code>
    </pre>
  )
}
