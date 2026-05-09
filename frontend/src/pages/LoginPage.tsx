/**
 * /login — single-column, vertically centered form. ~360px wide.
 *
 * Per T4.2 spec:
 *   - Submit label is "Sign in" (not "Login").
 *   - Per-field validation errors → inline under the field.
 *   - Credential errors → full-width banner above the form.
 *   - In single-user mode (boot fetch resolved), email is pre-filled
 *     and disabled; the user only types a password.
 */
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { FormField } from '../components/FormField'
import { Input } from '../components/Input'
import { api } from '../lib/api'
import { setToken } from '../lib/auth'
import { APIError } from '../lib/errors'
import { useConfig } from '../lib/use-config'

export function LoginPage() {
  const navigate = useNavigate()
  const { from } = useSearch({ from: '/login' })
  const config = useConfig()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({})

  const singleUserEmail = config?.single_user ? config.single_user_email : null
  const effectiveEmail = singleUserEmail ?? email

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBannerError(null)
    setFieldError({})
    setSubmitting(true)
    try {
      const res = await api.auth.login(effectiveEmail, password)
      setToken(res.access_token)
      void navigate({ to: from ?? '/home' })
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 422) setFieldError(parseValidation(err))
        else setBannerError(err.code === 'invalid_credentials'
          ? 'Email or password is incorrect.'
          : `Sign in failed (${err.code}).`)
      } else {
        setBannerError('Network error. Try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-[360px] space-y-5">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-xs text-[color:var(--color-fg-subtle)]">
            {config?.single_user
              ? 'Single-user deployment — owner credentials only.'
              : 'PyPrep — Python interview prep'}
          </p>
        </header>
        {bannerError && <Banner variant="error">{bannerError}</Banner>}
        <FormField id="email" label="Email" error={fieldError.email}>
          <Input
            id="email" name="email" type="email" autoComplete="email"
            value={effectiveEmail}
            onChange={(e) => setEmail(e.target.value)}
            disabled={singleUserEmail !== null}
            invalid={!!fieldError.email}
            required
          />
        </FormField>
        <FormField id="password" label="Password" error={fieldError.password}>
          <Input
            id="password" name="password" type="password" autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!fieldError.password}
            required
          />
        </FormField>
        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </main>
  )
}

function parseValidation(err: APIError): { email?: string; password?: string } {
  if (err.code === 'invalid_email') return { email: 'Invalid email.' }
  if (err.code === 'password_too_short') return { password: 'Password is too short.' }
  if (err.code === 'password_too_long') return { password: 'Password is too long.' }
  return {}
}
