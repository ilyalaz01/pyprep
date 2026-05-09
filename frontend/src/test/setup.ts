/**
 * Vitest setup — runs once per worker before any test file.
 * Provides @testing-library/jest-dom matchers and a clean localStorage
 * + clean fetch mock between every test.
 */
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

afterEach(() => {
  localStorage.clear()
})
