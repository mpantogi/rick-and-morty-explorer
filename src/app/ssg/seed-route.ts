import type { QueryClient } from '@tanstack/vue-query'

import { characterQueries, toCharacterView } from '@/entities/character'
import { episodeQueries } from '@/entities/episode'

import { CatalogueError, loadCatalogue } from './catalogue'

const CHARACTER_PATH = /^\/characters\/([1-9]\d*)$/

// Fills a route's queries with the keys the page reads, so the prerendered HTML and the first
// client render (from the dehydrated state) show the data without a request.
export async function seedRoute(
  queryClient: QueryClient,
  routePath: string | undefined,
): Promise<void> {
  const [, rawId] = CHARACTER_PATH.exec(routePath ?? '') ?? []
  if (rawId === undefined) return
  const id = Number(rawId)
  const { characters, episodes } = await loadCatalogue()
  const character = characters.get(id)
  if (!character) throw new CatalogueError(`character ${rawId} is not in the catalogue`)
  const episodeIds = [...toCharacterView(character).episodeIds].sort((a, b) => a - b)
  queryClient.setQueryData(characterQueries.detail(id).queryKey, character)
  queryClient.setQueryData(
    episodeQueries.byIds(episodeIds).queryKey,
    episodeIds.flatMap((episodeId) => episodes.get(episodeId) ?? []),
  )
}
