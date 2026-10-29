import type { QueryClient } from '@tanstack/vue-query'

import { characterKeys } from '../api/query-keys'
import type { ApiCharacter, ApiCharacterPage } from '../api/schemas'

// Pages, details and favorites lists all hold full characters, and data never changes in a session.
// Lists go last: findCachedCharacters keeps the last object per id, the one favorite cards render.
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
  return [...fromPages, ...fromDetails, ...fromLists]
}

export function findCachedCharacter(
  queryClient: QueryClient,
  id: number,
): ApiCharacter | undefined {
  return cachedCharacters(queryClient).find((character) => character.id === id)
}

// All or nothing: with static data a partial list would never be completed by a refetch. An empty
// request gets no answer, so a disabled query stays empty and never reaches the prerendered page.
export function findCachedCharacters(
  queryClient: QueryClient,
  ids: readonly number[],
): ApiCharacter[] | undefined {
  if (ids.length === 0) return undefined
  const byId = new Map(cachedCharacters(queryClient).map((character) => [character.id, character]))
  const found = ids.flatMap((id) => byId.get(id) ?? [])
  return found.length === ids.length ? found : undefined
}
