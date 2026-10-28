import type { QueryClient } from '@tanstack/vue-query'

import { characterKeys } from '../api/query-keys'
import type { ApiCharacter, ApiCharacterPage } from '../api/schemas'

// The list and favorites already hold full characters, so a detail page opened from them is instant.
export function findCachedCharacter(
  queryClient: QueryClient,
  id: number,
): ApiCharacter | undefined {
  const fromPages = queryClient
    .getQueriesData<ApiCharacterPage | null>({ queryKey: characterKeys.apiPages() })
    .flatMap(([, page]) => page?.results ?? [])
  const fromLists = queryClient
    .getQueriesData<ApiCharacter[]>({ queryKey: characterKeys.byIdsAll() })
    .flatMap(([, list]) => list ?? [])
  return [...fromPages, ...fromLists].find((character) => character.id === id)
}
