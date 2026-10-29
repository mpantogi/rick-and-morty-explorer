import { http } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, watch } from 'vue'

import type { QueryClient } from '@tanstack/vue-query'

import { type CharacterView, characterQueries, fetchCharacterPage } from '@/entities/character'
import { STORAGE_KEYS } from '@/shared/config'

import { CHARACTERS } from '../../../../test/fixtures/characters'
import { API, apiJson } from '../../../../test/msw/handlers'
import { recordRequests, server } from '../../../../test/msw/server'
import { createTestQueryClient, renderComposable } from '../../../../test/render'
import { useFavoritesStore } from './favorites-store'
import { type ListLikeState, useFavoriteCharacters } from './use-favorite-characters'

const HERO_KEY = 'hero:0b4f3a52-8f1e-4a5b-9c7d-2e6f1a3b4c5d'
const PETE = {
  id: '6c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  name: 'Portal Pete',
  gender: 'male',
  image: 'https://example.com/pete.png',
  createdAt: '2026-10-28T12:00:00.000Z',
}
const PETE_KEY = `hero:${PETE.id}`

function saveFavorites(keys: readonly string[]): void {
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(keys))
}

function saveHeroes(heroes: readonly object[]): void {
  localStorage.setItem(STORAGE_KEYS.heroes, JSON.stringify(heroes))
}

async function setup(queryClient?: QueryClient) {
  const rendered = await renderComposable(
    () => {
      const favorites = useFavoriteCharacters()
      const store = useFavoritesStore()
      return { favorites, store }
    },
    { queryClient },
  )
  const { favorites, store } = rendered.result
  return { ...rendered, state: favorites.state, favorites, store }
}

function items(state: ListLikeState): CharacterView[] {
  if (state.kind !== 'ready') throw new Error(`Expected ready favorites, got ${state.kind}`)
  return state.items
}

function names(state: ListLikeState): string[] {
  return items(state).map((item) => item.name)
}

function record(id: number) {
  const character = CHARACTERS.find((candidate) => candidate.id === id)
  if (!character) throw new Error(`Character ${String(id)} is missing from the fixture`)
  return character
}

describe('useFavoriteCharacters', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is empty at once, without a request, when nothing is saved', async () => {
    const paths = recordRequests('character/:ids')
    const { state, favorites } = await setup()

    expect(state.value).toEqual({ kind: 'empty' })
    expect(favorites.savedCount.value).toBe(0)
    await nextTick()
    expect(paths).toEqual([])
  })

  it('loads every saved character in one request and keeps the saved order', async () => {
    saveFavorites(['api:3', 'api:1', 'api:2'])
    const paths = recordRequests('character/:ids')
    const { state, favorites } = await setup()

    expect(state.value).toEqual({ kind: 'loading' })
    expect(favorites.savedCount.value).toBe(3)
    await vi.waitFor(() => {
      expect(state.value).toMatchObject({ kind: 'ready', isUpdating: false })
    })

    expect(paths).toEqual(['/api/character/[1,2,3]'])
    expect(names(state.value)).toEqual(['Summer Smith', 'Rick Sanchez', 'Morty Smith'])
  })

  it('drops characters the API no longer has and heroes this browser does not hold', async () => {
    saveFavorites([HERO_KEY, 'api:99999', 'api:5'])
    const { state } = await setup()

    await vi.waitFor(() => {
      expect(state.value.kind).toBe('ready')
    })
    expect(names(state.value)).toEqual(['Jerry Smith'])
  })

  it('needs no request when only heroes are saved', async () => {
    saveFavorites([HERO_KEY])
    const paths = recordRequests('character/:ids')
    const { state } = await setup()

    await nextTick()

    expect(state.value).toEqual({ kind: 'empty' })
    expect(paths).toEqual([])
  })

  it('lists a favorited created hero at once, without a request', async () => {
    saveHeroes([PETE])
    saveFavorites([PETE_KEY])
    const paths = recordRequests('character/:ids')
    const { state } = await setup()

    expect(state.value).toMatchObject({
      kind: 'ready',
      isUpdating: false,
      items: [{ source: 'hero', name: 'Portal Pete' }],
    })
    await nextTick()
    expect(paths).toEqual([])
  })

  it('keeps created heroes and API characters in the saved order', async () => {
    saveHeroes([PETE])
    saveFavorites(['api:2', PETE_KEY, 'api:1'])
    const { state } = await setup()

    await vi.waitFor(() => {
      expect(state.value.kind).toBe('ready')
    })
    expect(names(state.value)).toEqual(['Morty Smith', 'Portal Pete', 'Rick Sanchez'])
  })

  it('never drops a favorited hero from storage', async () => {
    saveHeroes([PETE])
    saveFavorites([PETE_KEY, HERO_KEY])
    const { store } = await setup()

    store.toggle('api:1')
    await nextTick()

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) ?? '[]')).toEqual([
      'api:1',
      PETE_KEY,
      HERO_KEY,
    ])
  })

  it('removes a favorite at once, never falling back to the skeleton', async () => {
    saveFavorites(['api:1', 'api:2'])
    const { state, store } = await setup()
    await vi.waitFor(() => {
      expect(state.value.kind).toBe('ready')
    })
    const kinds: string[] = []
    const stop = watch(
      () => state.value.kind,
      (kind) => {
        kinds.push(kind)
      },
      { flush: 'sync' },
    )

    store.toggle('api:1')

    expect(names(state.value)).toEqual(['Morty Smith'])
    await vi.waitFor(() => {
      expect(state.value).toMatchObject({ kind: 'ready', isUpdating: false })
    })
    stop()
    expect(kinds).toEqual([])
    expect(names(state.value)).toEqual(['Morty Smith'])
  })

  it('answers a removal from the cache and keeps the other cards as they were', async () => {
    saveFavorites(['api:3', 'api:1', 'api:2'])
    const { state, store, queryClient } = await setup()
    await vi.waitFor(() => {
      expect(state.value).toMatchObject({ kind: 'ready', isUpdating: false })
    })
    const [summer, , morty] = items(state.value)
    const paths = recordRequests('character/:ids')

    store.toggle('api:1')
    await nextTick()

    expect(state.value).toMatchObject({ kind: 'ready', isUpdating: false })
    expect(queryClient.isFetching()).toBe(0)
    const [first, second] = items(state.value)
    expect(first).toBe(summer)
    expect(second).toBe(morty)
    await new Promise((resolve) => setTimeout(resolve))
    expect(paths).toEqual([])
  })

  it('starts from characters the list already loaded, without a request', async () => {
    saveFavorites(['api:2', 'api:1'])
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(
      characterQueries.apiPage({}, 1).queryKey,
      await fetchCharacterPage({}, 1),
    )
    const paths = recordRequests('character/:ids')

    const { state } = await setup(queryClient)

    expect(state.value).toMatchObject({ kind: 'ready', isUpdating: false })
    expect(names(state.value)).toEqual(['Morty Smith', 'Rick Sanchez'])
    await new Promise((resolve) => setTimeout(resolve))
    expect(paths).toEqual([])
  })

  it('starts from a character page already in the cache, without a request', async () => {
    saveFavorites(['api:3'])
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(characterQueries.detail(3).queryKey, record(3))
    const paths = recordRequests('character/:ids')

    const { state } = await setup(queryClient)

    expect(names(state.value)).toEqual(['Summer Smith'])
    await new Promise((resolve) => setTimeout(resolve))
    expect(paths).toEqual([])
  })

  it('requests the whole list when one favorite is not cached yet', async () => {
    saveFavorites(['api:22', 'api:1'])
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(characterQueries.detail(1).queryKey, record(1))
    const paths = recordRequests('character/:ids')

    const { state } = await setup(queryClient)

    expect(state.value).toEqual({ kind: 'loading' })
    await vi.waitFor(() => {
      expect(names(state.value)).toEqual(['Aqua Rick', 'Rick Sanchez'])
    })
    expect(paths).toEqual(['/api/character/[1,22]'])
  })

  it('becomes empty when the last favorite is removed', async () => {
    saveFavorites(['api:1'])
    const { state, store } = await setup()
    await vi.waitFor(() => {
      expect(state.value.kind).toBe('ready')
    })

    store.toggle('api:1')

    expect(state.value).toEqual({ kind: 'empty' })
  })

  it('reports the server case, never an empty list, when the API fails', async () => {
    saveFavorites(['api:1'])
    server.use(http.get(`${API}/character/:ids`, () => apiJson({ error: 'boom' }, 500)))
    const { state } = await setup()

    await vi.waitFor(() => {
      expect(state.value).toEqual({ kind: 'error', errorCase: 'server' })
    })
  })

  it('loads again on retry', async () => {
    saveFavorites(['api:1'])
    server.use(
      http.get(`${API}/character/:ids`, () => apiJson({ error: 'boom' }, 500), { once: true }),
    )
    const { state, favorites } = await setup()
    await vi.waitFor(() => {
      expect(state.value.kind).toBe('error')
    })

    await favorites.retry()

    await vi.waitFor(() => {
      expect(state.value.kind).toBe('ready')
    })
  })

  it('stays loading without a request while prerendering', async () => {
    vi.stubEnv('SSR', true)
    saveFavorites(['api:1'])
    const paths = recordRequests('character/:ids')
    const { state } = await setup()

    await nextTick()

    expect(state.value).toEqual({ kind: 'loading' })
    expect(paths).toEqual([])
  })
})
