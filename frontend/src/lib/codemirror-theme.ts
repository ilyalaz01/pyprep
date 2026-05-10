/**
 * CodeMirror 6 theme pinned to PyPrep design tokens. Mirrors the
 * ShikiCodeBlock visual register so editor and read-only snippet
 * blocks belong to the same family.
 *
 * Dark-permanent on purpose, same justification as ShikiCodeBlock
 * (T4.5.7 ADR comment): code is the loud element on the page; a
 * light editor under prefers-color-scheme: light puts the only
 * intense surface on the quietest background, which reads worse
 * than keeping it dark across themes. Defensible deviation from
 * "respect the OS theme."
 *
 * Syntax-token palette borrows github-dark-dimmed semantics:
 * keywords reddish, strings warm-orange, comments muted-gray.
 */
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

export const pyprepEditorTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--color-fg)',
      backgroundColor: 'var(--color-bg-elevated)',
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
    },
    '.cm-content': {
      caretColor: 'var(--color-accent)',
      padding: '12px 0',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-accent)' },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'oklch(0.78 0.13 70 / 0.25)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-bg-elevated)',
      color: 'var(--color-fg-subtle)',
      border: 'none',
      borderRight: '1px solid var(--color-border)',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--color-surface-2)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--color-fg-muted)',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 8px' },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
      lineHeight: '1.55',
    },
  },
  { dark: true },
)

export const pyprepHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.controlKeyword], color: 'oklch(0.72 0.14 25)' },
    { tag: [t.string, t.special(t.string)], color: 'oklch(0.78 0.13 50)' },
    { tag: [t.number, t.bool, t.null], color: 'oklch(0.80 0.12 80)' },
    { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--color-fg-subtle)', fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'oklch(0.82 0.10 200)' },
    { tag: [t.className, t.typeName], color: 'oklch(0.84 0.09 145)' },
    { tag: [t.operator, t.punctuation], color: 'var(--color-fg-muted)' },
    { tag: [t.variableName, t.propertyName], color: 'var(--color-fg)' },
    { tag: t.invalid, color: 'var(--color-danger)' },
  ]),
)
