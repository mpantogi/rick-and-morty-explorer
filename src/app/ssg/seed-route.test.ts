import { http } from 'msw/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { toCharacterView, useCharacter } from '@/entities/character'
import { episodeQueries, useEpisodes } from '@/entities/episode'

import { findByIds, listCharacters } from '../../../test/api-semantics'
import { CHARACTERS } from '../../../test/fixtures/characters'
import { API, apiJson } from '../../../test/msw/handlers'
import { recordRequests, server } from '../../../test/msw/server'
import { createTestQueryClient, renderComposable } from '../../../test/render'
import { routes } from '../router/routes'

const AQUA_RICK = 22
const router = createRouter({ history: createMemoryHistory(), routes })

async function freshSeedRoute() {
  vi.resetModules()
  return import('./seed-route')
}

describe('seedRoute', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API}/character`, ({ request }) => {
        const { body, status } = listCharacters(CHARACTERS.slice(0, 24), new URL(request.url))
        return apiJson(body, status)
      }),
    )
  })

  it('seeds the same queries the character page reads, so it renders with no request', async () => {
    const { seedRoute } = await freshSeedRoute()
    const queryClient = createTestQueryClient()
    await seedRoute(queryClient, router.resolve(`/characters/${String(AQUA_RICK)}`))
    const record = CHARACTERS.find((character) => character.id === AQUA_RICK)
    if (!record) throw new Error('Aqua Rick is missing from the fixture')
    const paths = recordRequests()

    const { result } = await renderComposable(
      () => ({
        character: useCharacter(ref(AQUA_RICK)),
        episodes: useEpisodes(ref(toCharacterView(record).episodeIds)),
      }),
      { queryClient },
    )

    expect(result.character.state.value).toMatchObject({
      kind: 'ready',
      data: { name: 'Aqua Rick' },
    })
    expect(result.episodes.state.value).toMatchObject({
      kind: 'ready',
      data: [{ id: 10 }, { id: 22 }, { id: 28 }],
    })
    expect(paths).toEqual([])
  })

  it('keys the episodes by sorted id when the API lists them out of order', async () => {
    const shuffled = CHARACTERS.map((record) =>
      record.id === AQUA_RICK ? { ...record, episode: record.episode.toReversed() } : record,
    )
    server.use(
      http.get(`${API}/character/:ids`, ({ params }) => {
        const { body, status } = findByIds(shuffled, String(params.ids), 'Character')
        return apiJson(body, status)
      }),
    )
    const { seedRoute } = await freshSeedRoute()
    const queryClient = createTestQueryClient()

    await seedRoute(queryClient, router.resolve(`/characters/${String(AQUA_RICK)}`))

    expect(queryClient.getQueryData(episodeQueries.byIds([10, 22, 28]).queryKey)).toMatchObject([
      { id: 10 },
      { id: 22 },
      { id: 28 },
    ])
  })

  it.each(['/', '/favorites', '/404', '/characters/abc', '/characters/01'])(
    'seeds nothing for %s',
    async (routePath) => {
      const { seedRoute } = await freshSeedRoute()
      const queryClient = createTestQueryClient()

      await seedRoute(queryClient, router.resolve(routePath))

      expect(queryClient.getQueryCache().getAll()).toEqual([])
    },
  )

  it('fails the build for a character page the catalogue does not hold', async () => {
    const { seedRoute } = await freshSeedRoute()

    await expect(
      seedRoute(createTestQueryClient(), router.resolve('/characters/999')),
    ).rejects.toThrow('character 999 is not in the catalogue')
  })
})
