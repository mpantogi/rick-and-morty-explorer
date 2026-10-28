import { type QueryClient, queryOptions } from '@tanstack/vue-query'

import { toCharacterView } from '../model/mappers'
import { type ApiWindow, type PagePlan, planPage, sliceApiWindow } from '../model/pagination'
import { fetchCharacterPage } from './characters-api'
import { type ApiFilterParams, characterKeys } from './query-keys'

function apiPageQuery(params: ApiFilterParams, page: number) {
  return queryOptions({
    queryKey: characterKeys.apiPage(params, page),
    queryFn: ({ signal }) => fetchCharacterPage(params, page, signal),
  })
}

// Each API page is its own cached (and retried) query, so overlapping UI pages never refetch one.
async function fetchWindow(
  queryClient: QueryClient,
  params: ApiFilterParams,
  plan: PagePlan,
): Promise<ApiWindow> {
  const loadPage = (page: number) =>
    queryClient.query({ ...apiPageQuery(params, page), staleTime: 'static' })
  // Page 1 also answers "how many match" when local heroes fill the whole UI page.
  const pages = plan.apiPages.length > 0 ? plan.apiPages : [1]
  const results = await Promise.all(pages.map(loadPage))
  const counted =
    results.find((result) => result !== null) ?? (pages.includes(1) ? null : await loadPage(1))
  const characters = sliceApiWindow(
    plan,
    pages,
    results.map((result) => result?.results ?? null),
  )
  return { items: characters.map(toCharacterView), apiCount: counted?.info.count ?? 0 }
}

function windowQuery(
  params: ApiFilterParams,
  uiPage: number,
  localCount: number,
  queryClient: QueryClient,
) {
  return queryOptions({
    queryKey: characterKeys.window(params, uiPage, localCount),
    queryFn: () => fetchWindow(queryClient, params, planPage(uiPage, localCount)),
    // The API page queries inside already retried; retrying here would multiply the attempts.
    retry: false,
  })
}

export const characterQueries = {
  apiPage: apiPageQuery,
  window: windowQuery,
}
