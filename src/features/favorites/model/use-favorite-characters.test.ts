import { http } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, watch } from 'vue'

import { STORAGE_KEYS } from '@/shared/config'

import { API, apiJson } from '../../../../test/msw/handlers'
import { server } from '../../../../test/msw/server'
import { renderComposable } from '../../../../test/render'
import { useFavoritesStore } from './favorites-store'
import { type ListLikeState, useFavoriteCharacters } from './use-favorite-characters'

const HERO_KEY = 'hero:0b4f3a52-8f1e-4a5b-9c7d-2e6f1a3b4c5d'

function saveFavorites(keys: readonly string[]): void {
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(keys))
}

function trackByIdsRequests(): string[] {
  const paths: string[] = []
  server.use(
    http.get(`${API}/character/:ids`, ({ request }) => {
      paths.push(decodeURIComponent(new URL(request.url).pathname))
    }),
  )
  return paths
}

async function setup() {
  const rendered = await renderComposable(() => {
    const favorites = useFavoriteCharacters()
    const store = useFavoritesStore()
    return { favorites, store }
  })
  const { favorites, store } = rendered.result
  return { ...rendered, state: favorites.state, favorites, store }
}

function names(state: ListLikeState): string[] {
  if (state.kind !== 'ready') throw new Error(`Expected ready favorites, got ${state.kind}`)
  return state.items.map((item) => item.name)
}

describe('useFavoriteCharacters', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is empty at once, without a request, when nothing is saved', async () => {
    const paths = trackByIdsRequests()
    const { state, favorites } = await setup()

    expect(state.value).toEqual({ kind: 'empty' })
    expect(favorites.savedCount.value).toBe(0)
    await nextTick()
    expect(paths).toEqual([])
  })

  it('loads every saved character in one request and keeps the saved order', async () => {
    saveFavorites(['api:3', 'api:1', 'api:2'])
    const paths = trackByIdsRequests()
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
    const paths = trackByIdsRequests()
    const { state } = await setup()

    await nextTick()

    expect(state.value).toEqual({ kind: 'empty' })
    expect(paths).toEqual([])
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
    const paths = trackByIdsRequests()
    const { state } = await setup()

    await nextTick()

    expect(state.value).toEqual({ kind: 'loading' })
    expect(paths).toEqual([])
  })
})
