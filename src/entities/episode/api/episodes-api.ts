import { getJson } from '@/shared/api'

import { type ApiEpisode, apiEpisodeListSchema } from './schemas'

// The bracket form always answers a list (sorted by id, missing ids dropped), even for one id.
export function fetchEpisodesByIds(
  ids: readonly number[],
  signal?: AbortSignal,
): Promise<ApiEpisode[]> {
  return getJson({ path: `/episode/[${ids.join(',')}]`, schema: apiEpisodeListSchema, signal })
}
