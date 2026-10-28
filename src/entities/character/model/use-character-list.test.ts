import { http } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type ComputedRef, nextTick, ref, watch } from 'vue'

import { STORAGE_KEYS } from '@/shared/config'

import { API, apiJson } from '../../../../test/msw/handlers'
import { server } from '../../../../test/msw/server'
import { renderComposable } from '../../../../test/render'
import { characterKeys } from '../api/query-keys'
import { EMPTY_FILTERS } from './filters'
import type { Hero } from './hero-schema'
import { useHeroesStore } from './heroes-store'
import type { ListPage } from './pagination'
import type { CharacterFilters } from './types'
import { type ListState, useCharacterList } from './use-character-list'

const READY = { kind: 'ready', isUpdating: false } as const

function hero(name: string, gender: Hero['gender'], id: string): Hero {
  return {
    id,
    name,
    gender,
    image: 'https://example.com/hero.png',
    createdAt: '2026-10-28T12:00:00.000Z',
  }
}

// Newest first, as the store keeps them.
const HEROES: readonly Hero[] = [
  hero('Portal Pete', 'male', '6c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f'),
  hero('Plasma Pam', 'female', '7d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a'),
  hero('Quantum Quinn', 'genderless', '8e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b'),
]

function saveHeroes(heroes: readonly Hero[] = HEROES): void {
  localStorage.setItem(STORAGE_KEYS.heroes, JSON.stringify(heroes))
}

function trackListRequests(): URL[] {
  const urls: URL[] = []
  server.use(
    http.get(`${API}/character`, ({ request }) => {
      urls.push(new URL(request.url))
    }),
  )
  return urls
}

// Holds every list response until released, so in-between states can be observed.
function holdListResponses(): () => void {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.get(`${API}/character`, async () => {
      await gate
    }),
  )
  return release
}

async function setup(initial: { filters?: Partial<CharacterFilters>; page?: number } = {}) {
  const filters = ref<CharacterFilters>({ ...EMPTY_FILTERS, ...initial.filters })
  const page = ref(initial.page ?? 1)
  const kinds: ListState['kind'][] = []
  const rendered = await renderComposable(() => {
    const list = useCharacterList(filters, page)
    const heroes = useHeroesStore()
    watch(
      () => list.state.value.kind,
      (kind) => {
        kinds.push(kind)
      },
      { immediate: true },
    )
    return { ...list, heroes }
  })
  const { state, heroes } = rendered.result
  return { ...rendered, state, heroes, filters, page, kinds }
}

function readyPage(state: ComputedRef<ListState>): ListPage {
  const current = state.value
  if (current.kind !== 'ready') throw new Error(`Expected a ready list, got ${current.kind}`)
  return current.page
}

function names(state: ComputedRef<ListState>): string[] {
  return readyPage(state).items.map((item) => item.name)
}

describe('useCharacterList', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lists the first 12 of the 25 characters with the total', async () => {
    const { state } = await setup()

    await vi.waitFor(() => {
      expect(state.value).toMatchObject(READY)
    })
    expect(readyPage(state)).toMatchObject({
      total: 25,
      totalPages: 3,
      rangeStart: 1,
      rangeEnd: 12,
      outOfRange: false,
    })
    expect(names(state).slice(0, 2)).toEqual(['Rick Sanchez', 'Morty Smith'])
  })

  it('fills page 2 from API pages 1 and 2 without requesting either twice', async () => {
    const urls = trackListRequests()
    const { state, page } = await setup()
    await vi.waitFor(() => {
      expect(state.value).toMatchObject(READY)
    })

    page.value = 2

    await vi.waitFor(() => {
      expect(readyPage(state).items.map((item) => item.key)).toEqual(
        Array.from({ length: 12 }, (_, index) => `api:${String(index + 13)}`),
      )
    })
    expect(state.value).toMatchObject({ ...READY, page: { rangeStart: 13, rangeEnd: 24 } })
    expect(urls.map((url) => url.searchParams.get('page'))).toHaveLength(2)
    expect(new Set(urls.map((url) => url.searchParams.get('page')))).toEqual(new Set(['1', '2']))
  })

  it('never asks the API for a page past the last one', async () => {
    const urls = trackListRequests()
    // 19 male characters fit on one API page, yet UI page 2 spans API pages 1 and 2.
    const { state } = await setup({ filters: { gender: 'male' }, page: 2 })

    await vi.waitFor(() => {
      expect(state.value).toMatchObject({ ...READY, page: { rangeStart: 13, rangeEnd: 19 } })
    })
    expect(urls.map((url) => url.searchParams.get('page'))).toEqual(['1'])
  })

  it('reports no match when the filters find nothing', async () => {
    const { state } = await setup({ filters: { name: 'zzzz' } })

    await vi.waitFor(() => {
      expect(state.value).toEqual({ kind: 'empty', reason: 'no-match', totalPages: 1 })
    })
  })

  it.each([4, 100])('reports page %i of 3 as out of range', async (uiPage) => {
    const { state } = await setup({ page: uiPage })

    await vi.waitFor(() => {
      expect(state.value).toEqual({ kind: 'empty', reason: 'out-of-range', totalPages: 3 })
    })
  })

  it('shows the server error case, never an empty list, when the API fails', async () => {
    server.use(http.get(`${API}/character`, () => apiJson({ error: 'boom' }, 500)))
    const { state, kinds } = await setup()

    await vi.waitFor(() => {
      expect(state.value).toEqual({ kind: 'error', errorCase: 'server' })
    })
    expect(kinds).toEqual(['loading', 'error'])
  })

  it('loads again on retry and shows the list once the API recovers', async () => {
    server.use(http.get(`${API}/character`, () => apiJson({ error: 'boom' }, 500), { once: true }))
    const { state, result, kinds } = await setup()
    await vi.waitFor(() => {
      expect(state.value.kind).toBe('error')
    })

    await result.retry()

    await vi.waitFor(() => {
      expect(state.value).toMatchObject(READY)
    })
    expect(kinds).toEqual(['loading', 'error', 'loading', 'ready'])
  })

  it('keeps the previous characters on screen, marked as updating, while new filters load', async () => {
    const { state, filters } = await setup()
    await vi.waitFor(() => {
      expect(state.value).toMatchObject(READY)
    })
    const release = holdListResponses()

    filters.value = { ...EMPTY_FILTERS, name: 'morty' }

    await vi.waitFor(() => {
      expect(state.value).toMatchObject({ kind: 'ready', isUpdating: true })
    })
    expect(names(state)[0]).toBe('Rick Sanchez')
    release()
    await vi.waitFor(() => {
      expect(state.value).toMatchObject(READY)
    })
    expect(names(state)).toEqual(['Morty Smith', 'Alien Morty', 'Antenna Morty', 'Aqua Morty'])
  })

  it('shows loading, not an empty grid, while a search replaces an empty result', async () => {
    const { state, filters, kinds } = await setup({ filters: { name: 'zzzz' } })
    await vi.waitFor(() => {
      expect(state.value.kind).toBe('empty')
    })
    const release = holdListResponses()

    filters.value = { ...EMPTY_FILTERS, name: 'morty' }
    await nextTick()

    expect(state.value).toEqual({ kind: 'loading' })
    release()
    await vi.waitFor(() => {
      expect(state.value).toMatchObject(READY)
    })
    expect(kinds).toEqual(['loading', 'empty', 'loading', 'ready'])
  })

  it('prefetches the next page once the current one is ready', async () => {
    const { state, queryClient } = await setup()
    await vi.waitFor(() => {
      expect(state.value).toMatchObject(READY)
    })

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(characterKeys.window({}, 2, 0))).toBeDefined()
    })
  })

  it('does not prefetch past the last page', async () => {
    const { state, queryClient } = await setup({ page: 3 })
    await vi.waitFor(() => {
      expect(state.value).toMatchObject(READY)
    })
    await nextTick()

    expect(
      queryClient.getQueryCache().find({ queryKey: characterKeys.window({}, 4, 0) }),
    ).toBeUndefined()
  })

  it('stays loading without requesting anything while prerendering', async () => {
    vi.stubEnv('SSR', true)
    const urls = trackListRequests()
    const { state } = await setup()

    await nextTick()

    expect(state.value).toEqual({ kind: 'loading' })
    expect(urls).toEqual([])
  })

  describe('with created heroes', () => {
    it('lists the heroes first, then fills page 1 from the API', async () => {
      saveHeroes()
      const { state } = await setup()

      await vi.waitFor(() => {
        expect(state.value).toMatchObject(READY)
      })
      expect(names(state)).toEqual([
        'Portal Pete',
        'Plasma Pam',
        'Quantum Quinn',
        'Rick Sanchez',
        'Morty Smith',
        'Summer Smith',
        'Beth Smith',
        'Jerry Smith',
        'Abadango Cluster Princess',
        'Abradolf Lincler',
        'Adjudicator Rick',
        'Agency Director',
      ])
      expect(readyPage(state)).toMatchObject({
        total: 28,
        totalPages: 3,
        rangeStart: 1,
        rangeEnd: 12,
      })
    })

    it('continues the API list on page 2 where page 1 left it', async () => {
      saveHeroes()
      const { state } = await setup({ page: 2 })

      await vi.waitFor(() => {
        expect(state.value).toMatchObject(READY)
      })
      expect(readyPage(state).items.map((item) => item.key)).toEqual(
        Array.from({ length: 12 }, (_, index) => `api:${String(index + 10)}`),
      )
    })

    it('filters the heroes by the same rules as the API', async () => {
      saveHeroes()
      const { state } = await setup({ filters: { gender: 'male', status: 'unknown' } })

      await vi.waitFor(() => {
        expect(state.value).toMatchObject(READY)
      })
      expect(names(state).slice(0, 2)).toEqual(['Portal Pete', 'Abradolf Lincler'])
      expect(names(state)).not.toContain('Plasma Pam')
    })

    it('leaves the heroes out when a filter excludes them', async () => {
      saveHeroes()
      const { state } = await setup({ filters: { status: 'alive' } })

      await vi.waitFor(() => {
        expect(state.value).toMatchObject(READY)
      })
      expect(names(state)[0]).toBe('Rick Sanchez')
    })

    it('shows a hero the API cannot match, rather than an empty list', async () => {
      saveHeroes()
      const { state } = await setup({ filters: { name: 'quantum' } })

      await vi.waitFor(() => {
        expect(state.value).toMatchObject(READY)
      })
      expect(names(state)).toEqual(['Quantum Quinn'])
      expect(readyPage(state)).toMatchObject({ total: 1, totalPages: 1 })
    })

    it('puts a newly created hero first without a reload', async () => {
      const { state, heroes } = await setup()
      await vi.waitFor(() => {
        expect(state.value).toMatchObject(READY)
      })

      heroes.add({ name: 'Fresh Fran', gender: 'female', image: 'https://example.com/fran.png' })

      await vi.waitFor(() => {
        expect(names(state)[0]).toBe('Fresh Fran')
      })
      expect(readyPage(state).total).toBe(26)
    })
  })
})
