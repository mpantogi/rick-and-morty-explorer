import { QueryClient } from '@tanstack/vue-query'
import { http } from 'msw/http'
import { beforeEach, describe, expect, it } from 'vitest'

import { listCharacters } from '../../../../test/api-semantics'
import { CHARACTERS } from '../../../../test/fixtures/characters'
import { API, apiJson } from '../../../../test/msw/handlers'
import { server } from '../../../../test/msw/server'
import { characterQueries } from './queries'

const COPIES = 3
const ID_OFFSET = 1000
const RESPONSE_DELAY_MS = 25
// Three copies of the 25 fixture characters: four API pages, the last one short.
const MANY = Array.from({ length: COPIES }, (_, copy) =>
  CHARACTERS.map((character) => ({ ...character, id: character.id + copy * ID_OFFSET })),
).flat()

// Answers slowly enough that two requests sent together overlap, and counts the overlap.
function serveSlowly() {
  const traffic = { pages: [] as string[], inFlight: 0, maxInFlight: 0 }
  server.use(
    http.get(`${API}/character`, async ({ request }) => {
      const url = new URL(request.url)
      traffic.pages.push(url.searchParams.get('page') ?? '')
      traffic.inFlight += 1
      traffic.maxInFlight = Math.max(traffic.maxInFlight, traffic.inFlight)
      await new Promise((resolve) => setTimeout(resolve, RESPONSE_DELAY_MS))
      traffic.inFlight -= 1
      const { body, status } = listCharacters(MANY, url)
      return apiJson(body, status)
    }),
  )
  return {
    traffic,
    reset: () => {
      Object.assign(traffic, { pages: [], inFlight: 0, maxInFlight: 0 })
    },
  }
}

describe('characterQueries.window', () => {
  let queryClient = new QueryClient()

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  function loadWindow(uiPage: number) {
    return queryClient.query(characterQueries.window({}, uiPage, 0, queryClient))
  }

  it('asks for the first API page alone while the page count is unknown', async () => {
    const { traffic } = serveSlowly()

    const window = await loadWindow(2)

    expect(traffic.pages).toEqual(['1', '2'])
    expect(traffic.maxInFlight).toBe(1)
    expect(window.apiCount).toBe(75)
    expect(window.items.map((item) => item.key)).toEqual(
      Array.from({ length: 12 }, (_, index) => `api:${String(index + 13)}`),
    )
  })

  it('requests every planned page at once when a cached page knows the count', async () => {
    const { traffic, reset } = serveSlowly()
    await queryClient.query(characterQueries.apiPage({}, 4))
    reset()

    const window = await loadWindow(2)

    expect(traffic.pages.toSorted((a, b) => a.localeCompare(b))).toEqual(['1', '2'])
    expect(traffic.maxInFlight).toBe(2)
    expect(window.apiCount).toBe(75)
    expect(window.items).toHaveLength(12)
  })

  it('never requests a page past the known last one', async () => {
    const { traffic, reset } = serveSlowly()
    await queryClient.query(characterQueries.apiPage({}, 4))
    reset()

    const window = await loadWindow(8)

    expect(traffic.pages).toEqual([])
    expect(window).toEqual({ items: [], apiCount: 75 })
  })

  it('ignores the count cached for other filters', async () => {
    const { traffic, reset } = serveSlowly()
    await queryClient.query(characterQueries.apiPage({ name: 'rick' }, 1))
    reset()

    await loadWindow(2)

    expect(traffic.maxInFlight).toBe(1)
  })
})
