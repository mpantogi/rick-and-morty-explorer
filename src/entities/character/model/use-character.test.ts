import { http } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { CHARACTERS } from '../../../../test/fixtures/characters'
import { API, apiJson } from '../../../../test/msw/handlers'
import { recordRequests, server } from '../../../../test/msw/server'
import { createTestQueryClient, renderComposable } from '../../../../test/render'
import { fetchCharacterPage } from '../api/characters-api'
import { characterKeys } from '../api/query-keys'
import { useCharacter } from './use-character'

async function setup(id: number, queryClient = createTestQueryClient()) {
  const rendered = await renderComposable(() => useCharacter(ref(id)), { queryClient })
  return { ...rendered, state: rendered.result.state }
}

describe('useCharacter', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('loads the character and maps it to the view model', async () => {
    const paths = recordRequests('character/:ids')
    const { state } = await setup(2)

    expect(state.value).toEqual({ kind: 'loading' })
    await vi.waitFor(() => {
      expect(state.value.kind).toBe('ready')
    })

    expect(paths).toEqual(['/api/character/2'])
    expect(state.value).toMatchObject({
      kind: 'ready',
      data: { key: 'api:2', name: 'Morty Smith', status: 'alive', href: '/characters/2' },
    })
  })

  it('starts ready from a cached list page, without a request', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(characterKeys.apiPage({}, 1), await fetchCharacterPage({}, 1))
    const paths = recordRequests('character/:ids')

    const { state } = await setup(5, queryClient)

    expect(state.value).toMatchObject({ kind: 'ready', data: { name: 'Jerry Smith' } })
    expect(paths).toEqual([])
  })

  it('starts ready from a cached by-ids list, without a request', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(
      characterKeys.byIds([4, 266]),
      CHARACTERS.filter((character) => [4, 266].includes(character.id)),
    )
    const paths = recordRequests('character/:ids')

    const { state } = await setup(266, queryClient)

    expect(state.value).toMatchObject({ kind: 'ready', data: { name: 'Piece of Toast' } })
    expect(paths).toEqual([])
  })

  it('reports not_found for an id the API does not know', async () => {
    const { state } = await setup(99999)

    await vi.waitFor(() => {
      expect(state.value).toEqual({ kind: 'error', errorCase: 'not_found' })
    })
  })

  it('reports the server case and loads again on retry', async () => {
    server.use(
      http.get(`${API}/character/:ids`, () => apiJson({ error: 'boom' }, 500), { once: true }),
    )
    const { state, result } = await setup(1)
    await vi.waitFor(() => {
      expect(state.value).toEqual({ kind: 'error', errorCase: 'server' })
    })

    await result.retry()

    await vi.waitFor(() => {
      expect(state.value).toMatchObject({ kind: 'ready', data: { name: 'Rick Sanchez' } })
    })
  })

  it('stays loading without a request while prerendering an uncached character', async () => {
    vi.stubEnv('SSR', true)
    const paths = recordRequests('character/:ids')
    const { state } = await setup(1)

    await nextTick()

    expect(state.value).toEqual({ kind: 'loading' })
    expect(paths).toEqual([])
  })
})
