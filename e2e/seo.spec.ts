import { readdirSync } from 'node:fs'

import type { APIRequestContext, Page } from '@playwright/test'

import { expect, openPage, test } from './fixtures'

const TITLE_MAX = 60
const DESCRIPTION_MAX = 155
const OK = 200
const NOT_FOUND = 404
const CHARACTER_PAGES = new URL('../dist/characters/', import.meta.url)

interface HeadSummary {
  titles: string[]
  description: string
  canonical: string
  robots: string
  social: Record<string, string>
  jsonLdTypes: string[]
  hasCspMeta: boolean
}

// The live API decided how many characters the build prerendered; the build, not this test, knows.
function prerenderedCharacterIds(): number[] {
  return readdirSync(CHARACTER_PAGES)
    .flatMap((file) => {
      const id = /^(\d+)\.html$/.exec(file)?.[1]
      return id === undefined ? [] : [Number(id)]
    })
    .toSorted((a, b) => a - b)
}

async function fetchText(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(path)
  expect(response.status(), path).toBe(OK)
  return response.text()
}

// Reads the prerendered HTML as crawlers get it; DOMParser never runs the page's scripts.
async function readHead(
  page: Page,
  request: APIRequestContext,
  path: string,
): Promise<HeadSummary> {
  const html = await fetchText(request, path)
  return page.evaluate((source): HeadSummary => {
    const doc = new DOMParser().parseFromString(source, 'text/html')
    const attribute = (selector: string, name: string) =>
      doc.querySelector(selector)?.getAttribute(name) ?? ''
    const social = [...doc.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')].map(
      (meta) => [
        meta.getAttribute('property') ?? meta.getAttribute('name') ?? '',
        meta.getAttribute('content') ?? '',
      ],
    )
    const jsonLd = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(
      (script) => JSON.parse(script.textContent) as { '@type'?: string; '@graph'?: object[] },
    )
    return {
      titles: [...doc.querySelectorAll('title')].map((title) => title.textContent),
      description: attribute('meta[name="description"]', 'content'),
      canonical: attribute('link[rel="canonical"]', 'href'),
      robots: attribute('meta[name="robots"]', 'content'),
      social: Object.fromEntries(social),
      jsonLdTypes: jsonLd.flatMap((data) =>
        [data, ...(data['@graph'] ?? [])].flatMap((node) =>
          '@type' in node ? [String(node['@type'])] : [],
        ),
      ),
      hasCspMeta: doc.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null,
    }
  }, html)
}

const INDEXED_PAGES = [
  { path: '/', canonicalPath: '/', jsonLdTypes: ['WebSite'] },
  {
    path: '/characters/1',
    canonicalPath: '/characters/1',
    jsonLdTypes: ['ProfilePage', 'Person', 'BreadcrumbList'],
  },
] as const

test.describe('prerendered SEO', () => {
  for (const { path, canonicalPath, jsonLdTypes } of INDEXED_PAGES) {
    test(`${path} carries its own title, description, canonical, social tags and JSON-LD`, async ({
      page,
      request,
    }) => {
      const head = await readHead(page, request, path)

      expect(head.titles).toHaveLength(1)
      expect(head.titles[0]?.length).toBeLessThanOrEqual(TITLE_MAX)
      expect(head.description).not.toBe('')
      expect(head.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
      expect(head.canonical).toMatch(/^https:\/\/[^/]+\//)
      expect(new URL(head.canonical).pathname).toBe(canonicalPath)
      expect(head.robots).toBe('index,follow')
      expect(head.social['og:url']).toBe(head.canonical)
      expect(head.social['og:title']).toBe(head.titles[0])
      expect(head.social['og:description']).toBe(head.description)
      expect(head.social['og:image']).toMatch(/^https:\/\//)
      expect(head.social['twitter:card']).toMatch(/^summary/)
      expect(head.social['twitter:image']).toBe(head.social['og:image'])
      expect(head.jsonLdTypes).toEqual(jsonLdTypes)
      expect(head.hasCspMeta).toBe(true)
    })
  }

  // A static host ignores the query, so /?page=3 is served the home document and the app must agree.
  test('keeps a plain list page on the canonical and robots of the HTML it is served', async ({
    page,
    request,
  }) => {
    const served = await readHead(page, request, '/?page=3')

    await openPage(page, '/?page=3')
    await expect(page.locator('#results [data-state="ready"]')).toBeVisible()

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', served.canonical)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', served.robots)
  })

  test('gives every indexed page a title of its own', async ({ page, request }) => {
    const titles = await Promise.all(
      INDEXED_PAGES.map(async ({ path }) => (await readHead(page, request, path)).titles[0]),
    )

    expect(new Set(titles).size).toBe(INDEXED_PAGES.length)
  })

  test('shares the home page with the absolute social card', async ({ page, request }) => {
    const head = await readHead(page, request, '/')

    expect(head.social['og:image']).toBe(new URL('/og-image.png', head.canonical).href)
    expect(head.social['twitter:card']).toBe('summary_large_image')
  })

  for (const path of ['/favorites', '/heroes/new']) {
    test(`${path} stays out of the index but keeps its links followed`, async ({
      page,
      request,
    }) => {
      const head = await readHead(page, request, path)

      expect(head.robots).toBe('noindex,follow')
    })
  }
})

test.describe('crawler files', () => {
  test('the sitemap lists the home page and every prerendered character page', async ({
    request,
  }) => {
    const sitemap = await fetchText(request, '/sitemap.xml')
    const prerendered = prerenderedCharacterIds()
    const listed = [...sitemap.matchAll(/<loc>https:\/\/[^<]+\/characters\/(\d+)<\/loc>/g)]
      .map(([, id = '']) => Number(id))
      .toSorted((a, b) => a - b)

    expect(prerendered.length).toBeGreaterThan(0)
    expect(sitemap).toMatch(/<loc>https:\/\/[^<]+\/<\/loc>/)
    expect(listed).toEqual(prerendered)
    expect(sitemap.match(/<url>/g)).toHaveLength(prerendered.length + 1)
  })

  test('robots.txt allows crawling and points to the sitemap', async ({ request }) => {
    const robots = await fetchText(request, '/robots.txt')

    expect(robots).toContain('User-agent: *\nAllow: /')
    expect(robots).toMatch(/^Sitemap: https:\/\/.+\/sitemap\.xml$/m)
  })

  test('llms.txt describes the site for AI agents', async ({ request }) => {
    const llms = await fetchText(request, '/llms.txt')

    expect(llms.startsWith('# Rick and Morty Explorer\n')).toBe(true)
  })

  test('the brand assets the head links to are served', async ({ request }) => {
    const assets = {
      '/favicon.ico': 'image/x-icon',
      '/favicon.svg': 'image/svg+xml',
      '/apple-touch-icon.png': 'image/png',
      '/site.webmanifest': 'application/manifest+json',
      '/og-image.png': 'image/png',
    }

    for (const [path, type] of Object.entries(assets)) {
      const response = await request.get(path)
      expect(response.status(), path).toBe(OK)
      expect(response.headers()['content-type'], path).toBe(type)
    }
  })

  test('an unknown path answers 404', async ({ request }) => {
    const response = await request.get('/nope')

    expect(response.status()).toBe(NOT_FOUND)
  })
})
