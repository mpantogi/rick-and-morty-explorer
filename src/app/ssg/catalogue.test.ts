import { http } from 'msw/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCharacters } from '../../../test/api-semantics'
import { CHARACTERS } from '../../../test/fixtures/characters'
import { API, apiJson } from '../../../test/msw/handlers'
import { recordRequests, server } from '../../../test/msw/server'

// Fixture ids run 1–24 and then jump to 266; the first 24 form a contiguous catalogue.
const CONTIGUOUS = CHARACTERS.slice(0, 24)

function serveContiguousList(): void {
  server.use(
    http.get(`${API}/character`, ({ request }) => {
      const { body, status } = listCharacters(CONTIGUOUS, new URL(request.url))
      return apiJson(body, status)
    }),
  )
}

// The catalogue is memoised per module, so each test loads a fresh copy.
async function freshCatalogue() {
  vi.resetModules()
  return import('./catalogue')
}

describe('loadCatalogue', () => {
  beforeEach(() => {
    serveContiguousList()
  })

  it('loads every character and every episode they reference in three requests', async () => {
    const paths = recordRequests()
    const { loadCatalogue } = await freshCatalogue()

    const { characters, episodes } = await loadCatalogue()

    expect(characters.size).toBe(24)
    expect(characters.get(22)).toMatchObject({ name: 'Aqua Rick' })
    expect([...episodes.keys()]).toEqual([1, 3, 10, 22, 28])
    expect(paths).toHaveLength(3)
    expect(paths[0]).toBe('/api/character?page=1')
    expect(paths[1]).toBe(
      `/api/character/[${Array.from({ length: 24 }, (_, index) => index + 1).join(',')}]`,
    )
    expect(paths[2]).toMatch(/^\/api\/episode\/\[1,2,3,/)
  })

  it('answers every later call from the first load', async () => {
    const paths = recordRequests()
    const { loadCatalogue } = await freshCatalogue()

    const [first, second] = await Promise.all([loadCatalogue(), loadCatalogue()])

    expect(second).toBe(first)
    expect(paths).toHaveLength(3)
  })

  it('fails the build when the ids are not 1..N, instead of skipping pages', async () => {
    server.use(
      http.get(`${API}/character`, ({ request }) => {
        const { body, status } = listCharacters(CHARACTERS, new URL(request.url))
        return apiJson(body, status)
      }),
    )
    const { CatalogueError, loadCatalogue } = await freshCatalogue()

    const failure = loadCatalogue()

    await expect(failure).rejects.toBeInstanceOf(CatalogueError)
    await expect(failure).rejects.toThrow('character ids are not contiguous 1..N')
  })

  it('fails the build when the API lists no characters at all', async () => {
    server.use(http.get(`${API}/character`, () => apiJson({ error: 'There is nothing here' }, 404)))
    const { CatalogueError, loadCatalogue } = await freshCatalogue()

    await expect(loadCatalogue()).rejects.toBeInstanceOf(CatalogueError)
  })

  it('fails the build when the API is down', async () => {
    server.use(http.get(`${API}/character`, () => apiJson({ error: 'boom' }, 500)))
    const { loadCatalogue } = await freshCatalogue()

    await expect(loadCatalogue()).rejects.toMatchObject({ name: 'ApiError', status: 500 })
  })
})

describe('prerenderRoutes', () => {
  beforeEach(() => {
    serveContiguousList()
  })

  it('lists the static pages and one page per character', async () => {
    vi.resetModules()
    const { prerenderRoutes } = await import('./prerender-routes')

    const routes = await prerenderRoutes()

    expect(routes.slice(0, 5)).toEqual(['/', '/favorites', '/heroes/new', '/heroes/shell', '/404'])
    expect(routes.slice(5)).toEqual(
      Array.from({ length: 24 }, (_, index) => `/characters/${String(index + 1)}`),
    )
  })
})
