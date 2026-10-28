import { z } from 'zod'

// The build's Vite config loads this file too; Vite's coming native config loader needs extensions.
import { SITE } from './site.ts'

export interface RawEnv {
  readonly VITE_SITE_URL?: string
  readonly VITE_API_BASE_URL?: string
}

export interface Env {
  readonly siteUrl: string
  readonly apiBaseUrl: string
}

function stripTrailingSlashes(url: string): string {
  let end = url.length
  while (url.endsWith('/', end)) end -= 1
  return url.slice(0, end)
}

const httpsUrl = z.url({ protocol: /^https$/ }).transform(stripTrailingSlashes)

const envSchema = z.object({
  VITE_SITE_URL: httpsUrl.default(SITE.defaultUrl),
  VITE_API_BASE_URL: httpsUrl.default(SITE.apiBaseUrl),
})

// Shared by the app (import.meta.env) and the build (loadEnv), so both use one validated site URL.
export function parseEnv(raw: RawEnv): Env {
  const parsed = envSchema.parse(raw)
  return { siteUrl: parsed.VITE_SITE_URL, apiBaseUrl: parsed.VITE_API_BASE_URL }
}
