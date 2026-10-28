import { ApiError, getJson } from '@/shared/api'

import type { ApiFilterParams } from './query-keys'
import {
  type ApiCharacter,
  apiCharacterListSchema,
  type ApiCharacterPage,
  apiCharacterPageSchema,
  apiCharacterSchema,
} from './schemas'

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

// A 404 propagates: on the detail page it is the not-found case, not an empty result.
export function fetchCharacter(id: number, signal?: AbortSignal): Promise<ApiCharacter> {
  return getJson({ path: `/character/${id}`, schema: apiCharacterSchema, signal })
}

// The bracket form always answers a list (sorted by id, missing ids dropped), even for one id.
export function fetchCharactersByIds(
  ids: readonly number[],
  signal?: AbortSignal,
): Promise<ApiCharacter[]> {
  return getJson({ path: `/character/[${ids.join(',')}]`, schema: apiCharacterListSchema, signal })
}
