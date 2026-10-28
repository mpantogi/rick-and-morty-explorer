import { http } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { API, apiJson } from '../../../../test/msw/handlers'
import { recordRequests, server } from '../../../../test/msw/server'
import { createTestQueryClient, renderComposable } from '../../../../test/render'
import { episodeQueries } from '../api/queries'
import { useEpisodes } from './use-episodes'

async function setup(ids: readonly number[]) {
  const rendered = await renderComposable(() => useEpisodes(ref(ids)))
  return { ...rendered, state: rendered.result.state }
}

describe('useEpisodes', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('loads the episodes in one request, sorted by id, as view models', async () => {
    const paths = recordRequests('episode/:ids')
    const { state } = await setup([22, 10])

    expect(state.value).toEqual({ kind: 'loading' })
    await vi.waitFor(() => {
      expect(state.value.kind).toBe('ready')
    })

    expect(paths).toEqual(['/api/episode/[10,22]'])
    expect(state.value).toEqual({
      kind: 'ready',
      data: [
        {
          id: 10,
          name: 'Close Rick-counters of the Rick Kind',
          code: 'S01E10',
          airDate: 'April 7, 2014',
          airDateIso: '2014-04-07',
        },
        {
          id: 22,
          name: 'The Rickshank Rickdemption',
          code: 'S03E01',
          airDate: 'April 1, 2017',
          airDateIso: '2017-04-01',
        },
      ],
    })
  })

  it('is ready with no episodes, without a request, when there are no ids', async () => {
    const paths = recordRequests('episode/:ids')
    const { state } = await setup([])

    await nextTick()

    expect(state.value).toEqual({ kind: 'ready', data: [] })
    expect(paths).toEqual([])
  })

  it('uses episodes already in the cache without a request', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(episodeQueries.byIds([3]).queryKey, [
      { id: 3, name: 'Anatomy Park', air_date: 'December 16, 2013', episode: 'S01E03' },
    ])
    const paths = recordRequests('episode/:ids')

    const { result } = await renderComposable(() => useEpisodes(ref([3])), { queryClient })

    expect(result.state.value).toMatchObject({ kind: 'ready', data: [{ id: 3 }] })
    expect(paths).toEqual([])
  })

  it('reports the server error case when the API fails', async () => {
    server.use(http.get(`${API}/episode/:ids`, () => apiJson({ error: 'boom' }, 500)))
    const { state } = await setup([1])

    await vi.waitFor(() => {
      expect(state.value).toEqual({ kind: 'error', errorCase: 'server' })
    })
  })

  it('loads again on retry', async () => {
    server.use(
      http.get(`${API}/episode/:ids`, () => apiJson({ error: 'boom' }, 500), { once: true }),
    )
    const { state, result } = await setup([1])
    await vi.waitFor(() => {
      expect(state.value.kind).toBe('error')
    })

    await result.retry()

    await vi.waitFor(() => {
      expect(state.value).toMatchObject({ kind: 'ready', data: [{ id: 1, code: 'S01E01' }] })
    })
  })

  it('stays loading without a request while prerendering an uncached list', async () => {
    vi.stubEnv('SSR', true)
    const paths = recordRequests('episode/:ids')
    const { state } = await setup([1])

    await nextTick()

    expect(state.value).toEqual({ kind: 'loading' })
    expect(paths).toEqual([])
  })
})
