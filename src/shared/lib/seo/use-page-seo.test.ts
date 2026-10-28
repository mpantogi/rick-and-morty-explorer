import { createHead, renderSSRHead } from '@unhead/vue/server'
import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'

import { type PageSeoInput, usePageSeo } from './use-page-seo'

const SITE_URL = 'https://rickverse-explorer.netlify.app'

async function renderHeadTags(input: PageSeoInput): Promise<string> {
  const head = createHead()
  const app = createSSRApp(() => null).use(head)
  app.runWithContext(() => {
    usePageSeo(input)
  })
  return (await renderSSRHead(head)).headTags
}

function parse(headTags: string): Document {
  return new DOMParser().parseFromString(`<head>${headTags}</head>`, 'text/html')
}

function content(doc: Document, selector: string): string | null | undefined {
  return doc.querySelector(selector)?.getAttribute('content')
}

describe('usePageSeo', () => {
  it('emits the title, description, canonical, robots, Open Graph and Twitter tags', async () => {
    const doc = parse(
      await renderHeadTags({
        title: 'Characters – page 2',
        description: 'A description that runs long. '.repeat(8),
        path: '/?page=2',
      }),
    )

    expect(doc.title).toBe('Characters – page 2 | Rick and Morty Explorer')
    expect(content(doc, 'meta[name="description"]')?.length).toBeLessThanOrEqual(155)
    expect(content(doc, 'meta[name="robots"]')).toBe('index,follow')
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE_URL}/?page=2`,
    )
    expect(content(doc, 'meta[property="og:url"]')).toBe(`${SITE_URL}/?page=2`)
    expect(content(doc, 'meta[property="og:type"]')).toBe('website')
    expect(content(doc, 'meta[property="og:site_name"]')).toBe('Rick and Morty Explorer')
    expect(content(doc, 'meta[property="og:locale"]')).toBe('en_US')
    expect(content(doc, 'meta[property="og:title"]')).toBe(doc.title)
    expect(content(doc, 'meta[name="twitter:title"]')).toBe(doc.title)
  })

  it('defaults the social image to the absolute 1200×630 site card', async () => {
    const doc = parse(await renderHeadTags({ title: 'Home', description: 'Home page.', path: '/' }))

    expect(content(doc, 'meta[property="og:image"]')).toBe(`${SITE_URL}/og-image.png`)
    expect(content(doc, 'meta[property="og:image:width"]')).toBe('1200')
    expect(content(doc, 'meta[property="og:image:height"]')).toBe('630')
    expect(content(doc, 'meta[name="twitter:image"]')).toBe(`${SITE_URL}/og-image.png`)
    expect(content(doc, 'meta[name="twitter:card"]')).toBe('summary_large_image')
  })

  it('marks noindex pages and emits no canonical or og:url without a path', async () => {
    const doc = parse(
      await renderHeadTags({ title: 'Page not found', description: 'Missing.', robots: 'noindex' }),
    )

    expect(content(doc, 'meta[name="robots"]')).toBe('noindex,follow')
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
    expect(doc.querySelector('meta[property="og:url"]')).toBeNull()
  })

  it('drops the canonical when a reactive path has none (a page that turned out missing)', async () => {
    const doc = parse(
      await renderHeadTags({
        title: 'Page not found',
        description: 'Missing.',
        path: () => null,
      }),
    )

    expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
  })

  it('uses a page-specific image and profile type when given', async () => {
    const doc = parse(
      await renderHeadTags({
        title: 'Rick Sanchez (#1)',
        description: 'Rick.',
        path: '/characters/1',
        ogType: 'profile',
        image: {
          url: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
          width: 300,
          height: 300,
          alt: 'Rick Sanchez',
          card: 'summary',
        },
      }),
    )

    expect(content(doc, 'meta[property="og:type"]')).toBe('profile')
    expect(content(doc, 'meta[property="og:image:alt"]')).toBe('Rick Sanchez')
    expect(content(doc, 'meta[name="twitter:card"]')).toBe('summary')
  })

  it('serialises JSON-LD without letting API text close the script element', async () => {
    const jsonLd = { '@type': 'Person', name: '</script><script>alert(1)</script>' }

    const headTags = await renderHeadTags({ title: 'X', description: 'Y', jsonLd })
    const script = parse(headTags).querySelector('script[type="application/ld+json"]')

    expect(headTags.match(/<\/script>/g)).toHaveLength(1)
    expect(JSON.parse(script?.textContent ?? '')).toEqual(jsonLd)
  })

  it('emits no JSON-LD script when there is no structured data', async () => {
    const doc = parse(await renderHeadTags({ title: 'X', description: 'Y', jsonLd: null }))

    expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull()
  })
})
