import { ApiError, getJson } from '@/shared/api'

import type { ApiFilterParams } from './query-keys'
import { type ApiCharacterPage, apiCharacterPageSchema } from './schemas'

// The API answers 404 for an empty result and for a page past the last one, so both mean "no items".
export async function fetchCharacterPage(
  params: ApiFilterParams,
  page: number,
  signal?: AbortSignal,
): Promise<ApiCharacterPage | null> {
  try {
    return await getJson({
      path: '/character',
      query: { ...params, page: String(page) },
      schema: apiCharacterPageSchema,
      signal,
    })
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null
    throw error
  }
}
