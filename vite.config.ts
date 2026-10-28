import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

import { createSsgOptions } from './build/ssg-options.ts'

export default defineConfig(({ mode }) => ({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Shared chunks otherwise run before the entry's own imports, so a schema could be built ahead
    // of src/app/zod-config.ts and probe `new Function`, which a CSP without 'unsafe-eval' reports.
    rolldownOptions: { output: { strictExecutionOrder: true } },
  },
  ssgOptions: createSsgOptions(mode),
}))
