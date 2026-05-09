/**
 * Vitest setup — runs once per worker before any test file.
 * Provides @testing-library/jest-dom matchers, a clean localStorage,
 * and unmounts any rendered React tree between tests (vitest 4 doesn't
 * auto-cleanup the way jest 27+ did with @testing-library/react).
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})
