/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Phase 6 (T6.0): worker.format='es' so worker.ts can use ES-module
// imports — the modern, vite-native shape. Required for the Pyodide
// worker introduced in T6.2. Vitest still mocks the worker per
// PRD_code_sandbox §6.1; jsdom doesn't run real Workers anyway.
//
// T6.11: `cold-start.html` is a second build entry. Built into
// dist/cold-start.html; the Playwright spec under `test/` navigates
// there to measure boot + first runCodeTask end-to-end. CI-only —
// not linked from the SPA.
//
// P6.5/P1-2: `pyodide-e2e.html` is a third build entry for the
// real-Pyodide e2e Playwright spec — boots the worker once, exposes
// runCodeTask on window, lets the spec drive the T6.10 + T6.12
// matrices against the real WASM runtime. Also CI-only.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'cold-start': resolve(__dirname, 'cold-start.html'),
        'pyodide-e2e': resolve(__dirname, 'pyodide-e2e.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    // `test/` is the Playwright tree (T6.11 cold-start gate). Vitest
    // only picks up unit specs under `src/`.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['test/**', 'node_modules', 'dist'],
  },
})
