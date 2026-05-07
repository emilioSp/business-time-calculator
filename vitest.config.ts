import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      TZ: 'Europe/Rome',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
})
