import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildLlmsTxt, buildRobots, buildSitemap, SeoFilesError, writeSeoFiles } from './seo-files'

const SITE_URL = 'https://rickverse-explorer.netlify.app'
const BUILD_DATE = '2026-10-29'
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot']

function locs(sitemap: string): string[] {
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc = '']) => loc)
}

// robots.txt groups are separated by blank lines.
function robotsGroups(robots: string): string[][] {
  return robots
    .trim()
    .split(/\n{2,}/)
    .map((group) => group.split('\n'))
}

describe('buildSitemap', () => {
  it('lists the home page and every character page with the build date', () => {
    const sitemap = buildSitemap(SITE_URL, [1, 2, 826], BUILD_DATE)

    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true)
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(locs(sitemap)).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/characters/1`,
      `${SITE_URL}/characters/2`,
      `${SITE_URL}/characters/826`,
    ])
    expect(sitemap.match(/<lastmod>2026-10-29<\/lastmod>/g)).toHaveLength(4)
  })

  it('leaves out priority and change frequency, which search engines ignore', () => {
    const sitemap = buildSitemap(SITE_URL, [1], BUILD_DATE)

    expect(sitemap).not.toContain('<priority>')
    expect(sitemap).not.toContain('<changefreq>')
  })
})

describe('buildRobots', () => {
  it('allows every crawler, names the AI crawlers and points to the sitemap', () => {
    const groups = robotsGroups(buildRobots(SITE_URL))

    expect(groups).toEqual([
      ['User-agent: *', 'Allow: /'],
      ...AI_CRAWLERS.map((crawler) => [`User-agent: ${crawler}`, 'Allow: /']),
      [`Sitemap: ${SITE_URL}/sitemap.xml`],
    ])
  })

  it('disallows nothing, so crawlers can still read the noindex pages', () => {
    expect(buildRobots(SITE_URL)).not.toMatch(/Disallow/i)
  })
})

describe('buildLlmsTxt', () => {
  it('opens with the site name and the one-line summary', () => {
    const [title, , summary] = buildLlmsTxt(SITE_URL).split('\n')

    expect(title).toBe('# Rick and Morty Explorer')
    expect(summary).toBe(
      '> Unofficial fan site to browse, filter and favorite characters from Rick and Morty, built on the public Rick and Morty API.',
    )
  })

  it('links the pages on the configured site, the sitemap and the data source', () => {
    const llms = buildLlmsTxt(SITE_URL)

    expect(llms).toContain(`(${SITE_URL}/)`)
    expect(llms).toContain(`(${SITE_URL}/characters/1)`)
    expect(llms).toContain(`(${SITE_URL}/sitemap.xml)`)
    expect(llms).toContain('(https://rickandmortyapi.com)')
    expect(llms).toContain(
      'Query parameters: `page`, `name`, `status`, `species`, `type`, `gender`.',
    )
  })

  it('says browser-only data has no crawlable page, without denying the favorites page', () => {
    expect(buildLlmsTxt(SITE_URL)).toContain(
      "- Favorites and created heroes are saved only in the visitor's browser, so no crawlable page lists them.",
    )
  })
})

describe('writeSeoFiles', () => {
  let outDir = ''

  beforeEach(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'seo-files-'))
    vi.useFakeTimers({ now: new Date(`${BUILD_DATE}T12:00:00Z`), toFake: ['Date'] })
  })

  afterEach(async () => {
    vi.useRealTimers()
    await rm(outDir, { recursive: true, force: true })
  })

  async function prerender(...files: string[]): Promise<void> {
    await mkdir(join(outDir, 'characters'), { recursive: true })
    await Promise.all(files.map((file) => writeFile(join(outDir, 'characters', file), '')))
  }

  it('writes the three files from the character pages that were prerendered', async () => {
    await prerender('10.html', '2.html', '1.html', 'notes.txt')

    await writeSeoFiles(outDir, SITE_URL)

    const [sitemap, robots, llms] = await Promise.all(
      ['sitemap.xml', 'robots.txt', 'llms.txt'].map((file) => readFile(join(outDir, file), 'utf8')),
    )
    expect(sitemap).toBe(buildSitemap(SITE_URL, [1, 2, 10], BUILD_DATE))
    expect(robots).toBe(buildRobots(SITE_URL))
    expect(llms).toBe(buildLlmsTxt(SITE_URL))
  })

  it('fails the build when no character page was prerendered', async () => {
    await prerender('notes.txt')

    await expect(writeSeoFiles(outDir, SITE_URL)).rejects.toThrow(SeoFilesError)
  })
})
