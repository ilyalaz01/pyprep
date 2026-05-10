/**
 * ShikiCodeBlock — renders highlighted HTML asynchronously. Until shiki
 * loads, falls back to a plain mono-font <pre><code> so the user sees
 * legible code immediately (no flash of empty content).
 *
 * `dangerouslySetInnerHTML` is safe here: input is markdown-derived
 * code text the SPA already trusts (it's lesson content from our own
 * /api/modules endpoint), and shiki's output is structured HTML with
 * no script vector.
 * TODO(multi-user): re-evaluate the dangerouslySetInnerHTML trust
 * assumption when user-authored content lands. Today the lesson is
 * owner-authored only; once peer/instructor authors can post, this
 * becomes an XSS surface and the input needs sanitization.
 *
 * Theme: github-dark-dimmed is dark-permanent on purpose. Geist Mono
 * on warm-dark surface is the lesson reader's identity; swapping to a
 * light theme under prefers-color-scheme: light would put the only
 * "loud" element on the page on a quiet background, which reads worse
 * than keeping the code block dark across themes. Defensible deviation
 * from "respect the OS theme."
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
