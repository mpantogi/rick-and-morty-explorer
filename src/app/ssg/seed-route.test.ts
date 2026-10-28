import { http } from 'msw/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { toCharacterView, useCharacter } from '@/entities/character'
import { useEpisodes } from '@/entities/episode'

import { listCharacters } from '../../../test/api-semantics'
import { CHARACTERS } from '../../../test/fixtures/characters'
import { API, apiJson } from '../../../test/msw/handlers'
import { recordRequests, server } from '../../../test/msw/server'
import { createTestQueryClient, renderComposable } from '../../../test/render'

const AQUA_RICK = 22

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
    await seedRoute(queryClient, `/characters/${String(AQUA_RICK)}`)
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

  it.each([undefined, '/', '/favorites', '/404', '/characters/abc'])(
    'seeds nothing for %s',
    async (routePath) => {
      const { seedRoute } = await freshSeedRoute()
      const queryClient = createTestQueryClient()

      await seedRoute(queryClient, routePath)

      expect(queryClient.getQueryCache().getAll()).toEqual([])
    },
  )

  it('fails the build for a character page the catalogue does not hold', async () => {
    const { seedRoute } = await freshSeedRoute()

    await expect(seedRoute(createTestQueryClient(), '/characters/999')).rejects.toThrow(
      'character 999 is not in the catalogue',
    )
  })
})
