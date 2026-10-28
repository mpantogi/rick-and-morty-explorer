import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadEnv() {
  vi.resetModules()
  const { env } = await import('./env')
  return env
}

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('falls back to the production site and the public API when nothing is configured', async () => {
    vi.stubEnv('VITE_SITE_URL', undefined)
    vi.stubEnv('VITE_API_BASE_URL', undefined)

    await expect(loadEnv()).resolves.toEqual({
      siteUrl: 'https://rickverse-explorer.netlify.app',
      apiBaseUrl: 'https://rickandmortyapi.com/api',
    })
  })

  it('strips trailing slashes from configured URLs', async () => {
    vi.stubEnv('VITE_SITE_URL', 'https://example.org//')
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.org/v1/')

    await expect(loadEnv()).resolves.toEqual({
      siteUrl: 'https://example.org',
      apiBaseUrl: 'https://api.example.org/v1',
    })
  })

  it('fails fast when the site URL is not https', async () => {
    vi.stubEnv('VITE_SITE_URL', 'http://example.org')

    await expect(loadEnv()).rejects.toThrow()
  })
})
