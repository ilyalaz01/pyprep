/**
 * CodeMirror 6 wrapper. Thin glue between React and EditorView —
 * mounts on first render, destroys on unmount, never tries to keep
 * React state and editor doc in lock-step (the editor IS the source
 * of truth for its content; parent reads it via onChange).
 *
 * Extensions deliberately limited to basicSetup + python() + theme +
 * Cmd-Enter keymap. NO autocomplete / linter / folding — interview
 * prep is supposed to make you think, not autocomplete past the
 * interesting bits. Same theme is dark-permanent, see codemirror-
 * theme.ts header.
 *
 * jsdom note: CodeMirror 6 needs real layout APIs, so this component
 * is exercised by manual QA + the CodeTaskCard test mocks it. We
 * keep the API surface small (initialDoc, onChange, onRun, minLines,
 * maxLines) so the mock can mimic it with a plain textarea.
 */
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { keymap } from '@codemirror/view'
import { python } from '@codemirror/lang-python'

import { pyprepEditorTheme, pyprepHighlight } from '../lib/codemirror-theme'

interface CodeMirrorEditorProps {
  initialDoc: string
  onChange: (value: string) => void
  onRun: () => void
  minLines?: number
  maxLines?: number
}

const LINE_HEIGHT_PX = 20

export function CodeMirrorEditor({
  initialDoc,
  onChange,
  onRun,
  minLines = 12,
  maxLines = 30,
}: CodeMirrorEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const view = new EditorView({
      doc: initialDoc,
      extensions: [
        basicSetup,
        python(),
        pyprepEditorTheme,
        pyprepHighlight,
        keymap.of([{
          key: 'Mod-Enter',
          run: () => { onRun(); return true },
          preventDefault: true,
        }]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChange(u.state.doc.toString())
        }),
        EditorView.theme({
          '&': {
            minHeight: `${minLines * LINE_HEIGHT_PX}px`,
            maxHeight: `${maxLines * LINE_HEIGHT_PX}px`,
          },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
      parent: host,
    })
    viewRef.current = view
    return () => view.destroy()
    // initialDoc/onChange/onRun captured at mount; ADR-016 React
    // isolation (parent key={card.id}) guarantees a fresh mount per
    // card so we don't need to react to prop changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={hostRef} data-testid="codemirror-host" />
}
