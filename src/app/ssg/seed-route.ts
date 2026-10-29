import type { QueryClient } from '@tanstack/vue-query'
import type { RouteLocationGeneric } from 'vue-router'

import { characterQueries, toCharacterView } from '@/entities/character'
import { episodeQueries } from '@/entities/episode'

import { CatalogueError, loadCatalogue } from './catalogue'

// Fills a route's queries with the keys the page reads, so the prerendered HTML and the first
// client render (from the dehydrated state) show the data without a request.
export async function seedRoute(
  queryClient: QueryClient,
  route: Pick<RouteLocationGeneric, 'name' | 'params'>,
): Promise<void> {
  if (route.name !== 'character') return
  const id = Number(route.params.id)
  const { characters, episodes } = await loadCatalogue()
  const character = characters.get(id)
  if (!character) throw new CatalogueError(`character ${String(id)} is not in the catalogue`)
  const episodeIds = [...toCharacterView(character).episodeIds].sort((a, b) => a - b)
  queryClient.setQueryData(characterQueries.detail(id).queryKey, character)
  queryClient.setQueryData(
    episodeQueries.byIds(episodeIds).queryKey,
    episodeIds.flatMap((episodeId) => episodes.get(episodeId) ?? []),
  )
}
