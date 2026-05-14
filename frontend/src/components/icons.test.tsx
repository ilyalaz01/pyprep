import { describe, expect, test } from 'vitest'
import { render } from '@testing-library/react'

import { Calendar, Check, Clock, Sparkles } from './icons'

describe('icons', () => {
  test.each([
    ['Check', Check],
    ['Clock', Clock],
    ['Calendar', Calendar],
    ['Sparkles', Sparkles],
  ])('%s renders an svg with viewBox 0 0 24 24', (_name, Icon) => {
    const { container } = render(<Icon />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  test('aria-hidden defaults to true (decorative)', () => {
    const { container } = render(<Check />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('className is applied to the svg root', () => {
    const { container } = render(<Calendar className="text-blue-500" />)
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-blue-500')
  })
})
