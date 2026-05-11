import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, renderHook } from '@testing-library/react'

import { useSessionKeys } from './use-session-keys'

const setup = (enabled = true, onExit = vi.fn()) => {
  document.body.innerHTML = ''
  renderHook(() => useSessionKeys({ enabled, onExit }))
  return { onExit }
}

const placeButton = (label: string, ariaLabel?: string) => {
  const b = document.createElement('button')
  b.textContent = label
  if (ariaLabel) b.setAttribute('aria-label', ariaLabel)
  b.onclick = vi.fn()
  document.body.appendChild(b)
  return b
}

beforeEach(() => { document.body.innerHTML = '' })
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks() })

describe('useSessionKeys — Space → reveal', () => {
  test('clicks the Reveal button when Space is pressed and one is in DOM', () => {
    setup()
    const reveal = placeButton('Reveal answer')
    fireEvent.keyDown(document, { key: ' ', code: 'Space' })
    expect(reveal.onclick).toHaveBeenCalled()
  })

  test('no-op when no Reveal button is present (other card types)', () => {
    setup()
    const random = placeButton('Submit')
    fireEvent.keyDown(document, { key: ' ' })
    expect(random.onclick).not.toHaveBeenCalled()
  })
})

describe('useSessionKeys — digits 1..4 fire ratings', () => {
  test.each([
    ['1', 'Again (key 1)'], ['2', 'Hard (key 2)'],
    ['3', 'Good (key 3)'], ['4', 'Easy (key 4)'],
  ] as const)('digit %s clicks the (key %s) rating button', (digit, aria) => {
    setup()
    const ratingBtn = placeButton(aria.split(' ')[0], aria)
    fireEvent.keyDown(document, { key: digit })
    expect(ratingBtn.onclick).toHaveBeenCalled()
  })

  test('digit press is no-op when the rating button is not in DOM (pre-reveal)', () => {
    setup()
    fireEvent.keyDown(document, { key: '3' })
    // No throw, no click — nothing to click. Pin via no rating button
    // present after the press either.
    expect(document.querySelector('button[aria-label*="(key 3)"]')).toBeNull()
  })
})

describe('useSessionKeys — Esc → confirm + onExit', () => {
  test('Esc with confirm true calls onExit', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { onExit } = setup()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(window.confirm).toHaveBeenCalled()
    expect(onExit).toHaveBeenCalled()
  })

  test('Esc with confirm false does not call onExit', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { onExit } = setup()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(window.confirm).toHaveBeenCalled()
    expect(onExit).not.toHaveBeenCalled()
  })
})

describe('useSessionKeys — gating', () => {
  test('enabled=false ignores all keys', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { onExit } = setup(false)
    const reveal = placeButton('Reveal answer')
    const rating = placeButton('Good', 'Good (key 3)')
    fireEvent.keyDown(document, { key: ' ' })
    fireEvent.keyDown(document, { key: '3' })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(reveal.onclick).not.toHaveBeenCalled()
    expect(rating.onclick).not.toHaveBeenCalled()
    expect(onExit).not.toHaveBeenCalled()
  })

  test('does not fire when an editable element has focus', () => {
    setup()
    const rating = placeButton('Good', 'Good (key 3)')
    const input = document.createElement('input')
    document.body.appendChild(input); input.focus()
    fireEvent.keyDown(input, { key: '3' })
    expect(rating.onclick).not.toHaveBeenCalled()
  })

  test('cleans up on unmount — keys after unmount are no-ops', () => {
    const onExit = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { unmount } = renderHook(() => useSessionKeys({ enabled: true, onExit }))
    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onExit).not.toHaveBeenCalled()
  })
})
