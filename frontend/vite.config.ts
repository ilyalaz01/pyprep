/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Phase 6 (T6.0): worker.format='es' so worker.ts can use ES-module
// imports — the modern, vite-native shape. Required for the Pyodide
// worker introduced in T6.2. Vitest still mocks the worker per
// PRD_code_sandbox §6.1; jsdom doesn't run real Workers anyway.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
  },
})
