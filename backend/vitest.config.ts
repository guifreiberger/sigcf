import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['reflect-metadata'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/database/**'],
      // lcov com caminhos a partir da raiz do repositório, como o SonarCloud espera.
      reporter: ['text-summary', 'text', ['lcov', { projectRoot: '..' }]],
      // Meta do playbook para o backend; abaixo disso o CI falha.
      thresholds: { statements: 75, branches: 75, functions: 75, lines: 75 },
    },
  },
});
