import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { loadEnv } from 'vite'
import type { ViteSSGOptions } from 'vite-ssg'

import { parseEnv } from '../src/shared/config/parse-env.ts'
import { injectCsp, inlineScripts } from './csp.ts'
import { writeSeoFiles } from './seo-files.ts'

// vite-ssg writes to Vite's default outDir under the project root, which is the working directory.
const OUT_DIR = 'dist'

export function createSsgOptions(mode: string): ViteSSGOptions {
  const { siteUrl, apiBaseUrl } = parseEnv(loadEnv(mode, process.cwd(), 'VITE_'))
  const csp = {
    templateScripts: inlineScripts(readFileSync('index.html', 'utf8')),
    apiOrigin: new URL(apiBaseUrl).origin,
  }
  return {
    dirStyle: 'flat',
    formatting: 'none',
    beastiesOptions: false,
    // Runs on the final HTML of each page, after the head and the state script are in place.
    onPageRendered: (_route, html) => injectCsp(html, csp),
    async onFinished() {
      await writeSeoFiles(OUT_DIR, siteUrl)
      // Vite's SSR manifest only feeds vite-ssg's preload links; it is not for publishing.
      await rm(join(OUT_DIR, '.vite'), { recursive: true, force: true })
    },
  }
}
