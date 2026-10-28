import { queryOptions } from '@tanstack/vue-query'

import { fetchEpisodesByIds } from './episodes-api'

const episodeKeys = {
  all: ['episodes'] as const,
  // ids sorted ascending, so the prerendered seed and the page share one cache entry
  byIds: (ids: readonly number[]) => [...episodeKeys.all, 'by-ids', ids] as const,
}

export const episodeQueries = {
  byIds: (sortedIds: readonly number[]) =>
    queryOptions({
      queryKey: episodeKeys.byIds(sortedIds),
      queryFn: ({ signal }) => fetchEpisodesByIds(sortedIds, signal),
    }),
}
