/**
 * Tests for the in-house primitives — pin a11y attributes and variant
 * routing, NOT pixel layout. The visual audit (T4.7 close) will check
 * the latter via screenshots.
 */
import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Banner } from './Banner'
import { Button } from './Button'
import { FormField } from './FormField'
import { Input } from './Input'

describe('Button', () => {
  test('defaults to type="button" so it cannot accidentally submit a form', () => {
    render(<Button>click</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  test('forwards type="submit" when explicitly set', () => {
    render(<Button type="submit">go</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  test('fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>x</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  test('disabled prevents clicks', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        x
      </Button>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  test.each(['primary', 'secondary', 'ghost'] as const)(
    'variant %s applies a distinct theme-token-driven background',
    (variant) => {
      render(<Button variant={variant}>x</Button>)
      const btn = screen.getByRole('button')
      // Each variant must reference at least one --color-* token in its
      // class blob — guards against a future "let me hardcode #fff" PR.
      expect(btn.className).toMatch(/var\(--color-/)
    },
  )

  test('size sm renders a tighter height/text token than md (default)', () => {
    const { rerender } = render(<Button>md</Button>)
    expect(screen.getByRole('button').className).toMatch(/h-9/)
    rerender(<Button size="sm">sm</Button>)
    expect(screen.getByRole('button').className).toMatch(/h-7/)
  })
})

describe('Input', () => {
  test('renders without aria-invalid by default', () => {
    render(<Input id="x" placeholder="email" />)
    const el = screen.getByPlaceholderText('email')
    expect(el).not.toHaveAttribute('aria-invalid')
  })

  test('sets aria-invalid when invalid prop is true', () => {
    render(<Input id="x" placeholder="email" invalid />)
    expect(screen.getByPlaceholderText('email')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  test('disabled attribute carries through to the underlying input', () => {
    render(<Input id="x" placeholder="email" disabled />)
    expect(screen.getByPlaceholderText('email')).toBeDisabled()
  })

  test('pins disabled opacity at 60 (less harsh than the Tailwind 50 default)', () => {
    render(<Input id="x" placeholder="email" disabled />)
    expect(screen.getByPlaceholderText('email').className).toContain(
      'disabled:opacity-60',
    )
  })

  test('type="password" forwards (LoginPage relies on browser autofill)', () => {
    render(<Input id="x" type="password" data-testid="pw" />)
    expect(screen.getByTestId('pw')).toHaveAttribute('type', 'password')
  })
})

describe('FormField', () => {
  test('label is associated with the wrapped input via htmlFor/id', () => {
    render(
      <FormField id="email" label="Email">
        <Input id="email" />
      </FormField>,
    )
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  test('renders error with role=alert (announced by screen readers)', () => {
    render(
      <FormField id="email" label="Email" error="invalid format">
        <Input id="email" invalid />
      </FormField>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('invalid format')
  })

  test('renders hint when no error', () => {
    render(
      <FormField id="x" label="X" hint="optional">
        <Input id="x" />
      </FormField>,
    )
    expect(screen.getByText('optional')).toBeInTheDocument()
  })

  test('label.htmlFor matches the wrapped input id (no orphan label)', () => {
    render(
      <FormField id="email" label="Email">
        <Input id="email" />
      </FormField>,
    )
    const label = screen.getByText('Email').closest('label')!
    expect(label.getAttribute('for')).toBe('email')
  })
})

describe('Banner', () => {
  test('error variant uses role=alert (announced by screen readers)', () => {
    render(<Banner variant="error">Something broke.</Banner>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something broke.')
  })

  test('info variant uses role=status (polite, not interruptive)', () => {
    render(<Banner variant="info">Heads up.</Banner>)
    expect(screen.getByRole('status')).toHaveTextContent('Heads up.')
  })

  test('success variant uses role=status', () => {
    render(<Banner variant="success">All good.</Banner>)
    expect(screen.getByRole('status')).toHaveTextContent('All good.')
  })

  test('default variant is info', () => {
    render(<Banner>plain</Banner>)
    expect(screen.getByRole('status')).toHaveTextContent('plain')
  })
})
