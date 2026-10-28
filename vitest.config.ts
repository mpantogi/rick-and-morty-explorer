import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
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
            include: ['src/**/*.test.ts'],
            setupFiles: ['./test/setup.ts'],
          },
        },
        {
          extends: true,
          test: { name: 'node', environment: 'node', include: ['build/**/*.test.ts'] },
        },
      ],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,vue}', 'build/**/*.ts'],
        exclude: [
          '**/*.test.ts',
          '**/index.ts',
          'src/app/main.ts',
          'src/app/zod-config.ts',
          'build/ssg-options.ts',
        ],
        reporter: ['text', 'html', 'lcov'],
        thresholds: { lines: 85, statements: 85, functions: 85, branches: 80 },
      },
    },
  }),
)
