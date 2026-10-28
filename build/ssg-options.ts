import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { loadEnv } from 'vite'
import type { ViteSSGOptions } from 'vite-ssg'

import { parseEnv } from '../src/shared/config/parse-env.ts'
import { writeSeoFiles } from './seo-files.ts'

// vite-ssg writes to Vite's default outDir under the project root, which is the working directory.
const OUT_DIR = 'dist'

export function createSsgOptions(mode: string): ViteSSGOptions {
  const { siteUrl } = parseEnv(loadEnv(mode, process.cwd(), 'VITE_'))
  return {
    dirStyle: 'flat',
    formatting: 'none',
    beastiesOptions: false,
    async onFinished() {
      await writeSeoFiles(OUT_DIR, siteUrl)
      // Vite's SSR manifest only feeds vite-ssg's preload links; it is not for publishing.
      await rm(join(OUT_DIR, '.vite'), { recursive: true, force: true })
    },
  }
}
