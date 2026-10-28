import { z } from 'zod'

import { SITE } from './site'

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

const parsed = envSchema.parse(import.meta.env)

export const env = {
  siteUrl: parsed.VITE_SITE_URL,
  apiBaseUrl: parsed.VITE_API_BASE_URL,
} as const
