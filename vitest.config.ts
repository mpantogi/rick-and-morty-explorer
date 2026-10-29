import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.ts'

export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        restoreMocks: true,
        projects: [
          {
            extends: true,
            test: {
              name: 'unit',
              environment: 'jsdom',
              environmentOptions: { jsdom: { url: 'https://rickandmortyapi.com/' } },
              include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
              setupFiles: ['./test/setup.ts'],
            },
          },
          {
            extends: true,
            test: {
              name: 'node',
              environment: 'node',
              include: ['build/**/*.test.ts', 'scripts/**/*.test.ts'],
            },
          },
        ],
        coverage: {
          provider: 'v8',
          include: ['src/**/*.{ts,vue}', 'build/**/*.ts', 'scripts/budget.ts'],
          exclude: ['**/*.test.ts', '**/index.ts', 'src/app/main.ts', 'build/ssg-options.ts'],
          reporter: ['text', 'html', 'lcov'],
          thresholds: { lines: 85, statements: 85, functions: 85, branches: 80 },
        },
      },
    }),
  ),
)
