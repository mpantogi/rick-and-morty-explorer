import { http } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type ComputedRef, nextTick, ref, watch } from 'vue'

import { API, apiJson } from '../../../../test/msw/handlers'
import { server } from '../../../../test/msw/server'
import { renderComposable } from '../../../../test/render'
import { characterKeys } from '../api/query-keys'
import { EMPTY_FILTERS } from './filters'
import type { ListPage } from './pagination'
import type { CharacterFilters } from './types'
import { type ListState, useCharacterList } from './use-character-list'

const READY = { kind: 'ready', isUpdating: false } as const

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
    watch(
      () => list.state.value.kind,
      (kind) => {
        kinds.push(kind)
      },
      { immediate: true },
    )
    return list
  })
  return { ...rendered, state: rendered.result.state, filters, page, kinds }
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
})
