import type { CharacterFilters } from '../model/types'

// Lowercased, non-empty values in a fixed key order, so equal searches share one cache entry.
export type ApiFilterParams = Readonly<Partial<Record<keyof CharacterFilters, string>>>

export const characterKeys = {
  all: ['characters'] as const,
  apiPages: () => [...characterKeys.all, 'api-page'] as const,
  apiPage: (params: ApiFilterParams, page: number) =>
    [...characterKeys.apiPages(), params, page] as const,
  window: (params: ApiFilterParams, uiPage: number, localCount: number) =>
    [...characterKeys.all, 'window', params, uiPage, localCount] as const,
}
