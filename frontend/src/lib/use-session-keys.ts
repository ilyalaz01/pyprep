// useSessionKeys (T5.12) — global keydown listener bound at the
// SessionPage level. Bindings:
//   Space → click the Reveal button if visible (flip cards only).
//   1..4  → click the matching rating button if RatingBar is visible.
//   Esc   → window.confirm; on yes, call onExit.
// Clicks the affordance via DOM lookup so disabled state and other
// per-card validations are respected by the same path the mouse uses.
// Pre-reveal digit presses are no-ops because the rating buttons
// aren't in the DOM yet.
//
// Per-card bindings (CodeMirror Cmd+Enter, FillIn Enter-on-last-blank)
// stay local and don't conflict — they only fire when their input
// element has focus, and this handler skips when an editable element
// is the event target.
import { useEffect } from 'react'

interface UseSessionKeysParams {
  enabled: boolean
  onExit: () => void
}

const EXIT_PROMPT =
  "Exit session? Your progress this session won't be saved as a completed run."

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable) return true
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function clickIfPresent(selector: string): void {
  const el = document.querySelector(selector)
  if (el instanceof HTMLElement) el.click()
}

export function useSessionKeys({ enabled, onExit }: UseSessionKeysParams): void {
  useEffect(() => {
    if (!enabled) return
    function handler(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return
      if (e.key === ' ' || e.code === 'Space') {
        // Reveal lives only on flip cards; query by accessible name.
        const buttons = document.querySelectorAll('button')
        for (const b of Array.from(buttons)) {
          if (/^reveal/i.test((b.textContent ?? '').trim())) {
            b.click(); e.preventDefault(); return
          }
        }
        return
      }
      if (e.key >= '1' && e.key <= '4') {
        clickIfPresent(`button[aria-label$="(key ${e.key})"]`)
        return
      }
      if (e.key === 'Escape') {
        if (window.confirm(EXIT_PROMPT)) onExit()
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, onExit])
}
