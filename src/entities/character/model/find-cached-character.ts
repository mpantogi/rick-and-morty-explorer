import type { QueryClient } from '@tanstack/vue-query'

import { characterKeys } from '../api/query-keys'
import type { ApiCharacter, ApiCharacterPage } from '../api/schemas'

// The list, the favorites and character pages hold full characters, so views built from them are
// instant: data never changes within a session.
function cachedCharacters(queryClient: QueryClient): ApiCharacter[] {
  const fromPages = queryClient
    .getQueriesData<ApiCharacterPage | null>({ queryKey: characterKeys.apiPages() })
    .flatMap(([, page]) => page?.results ?? [])
  const fromLists = queryClient
    .getQueriesData<ApiCharacter[]>({ queryKey: characterKeys.byIdsAll() })
    .flatMap(([, list]) => list ?? [])
  const fromDetails = queryClient
    .getQueriesData<ApiCharacter>({ queryKey: characterKeys.details() })
    .flatMap(([, character]) => character ?? [])
  return [...fromPages, ...fromLists, ...fromDetails]
}

export function findCachedCharacter(
  queryClient: QueryClient,
  id: number,
): ApiCharacter | undefined {
  return cachedCharacters(queryClient).find((character) => character.id === id)
}

// All or nothing: with static data a partial list would never be completed by a refetch.
export function findCachedCharacters(
  queryClient: QueryClient,
  ids: readonly number[],
): ApiCharacter[] | undefined {
  const byId = new Map(cachedCharacters(queryClient).map((character) => [character.id, character]))
  const found = ids.flatMap((id) => byId.get(id) ?? [])
  return found.length === ids.length ? found : undefined
}
