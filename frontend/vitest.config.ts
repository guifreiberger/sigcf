import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testes/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/testes/**', 'src/main.tsx'],
      reporter: ['text-summary', 'text', 'lcov', 'html'],
      // Meta do playbook para o frontend; abaixo disso o CI falha.
      thresholds: { statements: 25, branches: 25, functions: 25, lines: 25 },
    },
  },
})
