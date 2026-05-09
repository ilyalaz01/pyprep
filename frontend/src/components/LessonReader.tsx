/**
 * LessonReader — markdown body wrapped in a `.prose` container that
 * picks up the styling from `index.css`. Code blocks rendered via
 * ShikiCodeBlock; inline code styled by the .prose CSS.
 *
 * Why no Tailwind Typography: the `prose-*` classes ship a competing
 * opinion against DESIGN.md (line lengths, link colors, code-block
 * backgrounds). Direct CSS keeps the design system as the only voice.
 */
import type { ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { ShikiCodeBlock } from './ShikiCodeBlock'

interface LessonReaderProps {
  markdown: string
}

type CodeProps = ComponentProps<'code'> & { node?: unknown; inline?: boolean }

export function LessonReader({ markdown }: LessonReaderProps) {
  return (
    <article className="prose mx-auto max-w-[680px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children }: CodeProps) {
            const text = String(children).replace(/\n$/, '')
            if (inline || !className) return <code>{text}</code>
            const lang = className.replace(/^language-/, '')
            return <ShikiCodeBlock code={text} lang={lang} />
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  )
}
