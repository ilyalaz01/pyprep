import { describe, expect, test } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { ModulesList } from './ModulesList'

describe('ModulesList', () => {
  test('renders all 4 modules from the hard-coded roster', () => {
    render(<ModulesList data={{ modules: [] }} />)
    expect(screen.getByText(/Python Core & OOP/)).toBeInTheDocument()
    expect(screen.getByText(/Automation, Scripting & Infrastructure/)).toBeInTheDocument()
    expect(screen.getByText(/Testing & QA/)).toBeInTheDocument()
    expect(screen.getByText(/Linux, Docker, SQL & Git/)).toBeInTheDocument()
  })

  test('module without content renders dimmed and aria-disabled (not a link)', () => {
    render(<ModulesList data={{ modules: [] }} />)
    const m2Row = screen.getByText(/Automation, Scripting & Infrastructure/).closest('div')
    expect(m2Row).toHaveAttribute('aria-disabled', 'true')
    expect(within(m2Row!).getByText(/no content yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Module 2/i })).not.toBeInTheDocument()
  })

  test('module with content renders as a link with sphere + card counts', () => {
    render(
      <ModulesList
        data={{ modules: [{ module_id: 1, sphere_ids: ['m1-s0', 'm1-s1'], card_count: 23 }] }}
      />,
    )
    const link = screen.getByRole('link', { name: /Module 1/i })
    expect(link).toHaveAttribute('href', '/modules/1')
    expect(link).toHaveTextContent(/2 spheres · 23 cards/)
  })

  test('singular sphere/card pluralization is correct', () => {
    render(
      <ModulesList data={{ modules: [{ module_id: 1, sphere_ids: ['x'], card_count: 1 }] }} />,
    )
    expect(screen.getByText(/1 sphere · 1 card/)).toBeInTheDocument()
  })
})
