import { hashKey, type QueryClient, queryOptions } from '@tanstack/vue-query'

import { toCharacterView } from '../model/mappers'
import { type ApiWindow, type PagePlan, planPage, sliceApiWindow } from '../model/pagination'
import { fetchCharacterPage } from './characters-api'
import { type ApiFilterParams, characterKeys } from './query-keys'
import type { ApiCharacterPage } from './schemas'

type PageResult = ApiCharacterPage | null
type PageLoader = (page: number) => Promise<PageResult>

interface LoadedPages {
  readonly pages: readonly number[]
  readonly results: readonly PageResult[]
  readonly count: number
}

function apiPageQuery(params: ApiFilterParams, page: number) {
  return queryOptions({
    queryKey: characterKeys.apiPage(params, page),
    queryFn: ({ signal }) => fetchCharacterPage(params, page, signal),
  })
}

// Key prefixes match objects partially (`{}` would match every search), so compare by hash.
function cachedInfo(queryClient: QueryClient, params: ApiFilterParams) {
  const paramsHash = hashKey([params])
  const cached = queryClient.getQueriesData<PageResult>({
    queryKey: characterKeys.apiPages(),
    predicate: (query) => hashKey([query.queryKey[2]]) === paramsHash,
  })
  return cached.find(([, page]) => page)?.[1]?.info
}

// With the page count known, every in-range page goes out in one round trip.
async function loadInRange(
  loadPage: PageLoader,
  plan: PagePlan,
  info: ApiCharacterPage['info'],
): Promise<LoadedPages> {
  const pages = plan.apiPages.filter((page) => page <= info.pages)
  return { pages, results: await Promise.all(pages.map(loadPage)), count: info.count }
}

// The first page says how many exist, so the rest never asks for one past the last (a 404).
// Page 1 also answers "how many match" when local heroes fill the whole UI page.
async function loadFirstThenRest(loadPage: PageLoader, plan: PagePlan): Promise<LoadedPages> {
  const [firstPage = 1, ...laterPages] = plan.apiPages
  const first = await loadPage(firstPage)
  const later = first === null ? [] : laterPages.filter((page) => page <= first.info.pages)
  const results = [first, ...(await Promise.all(later.map(loadPage)))]
  const counted = first ?? (firstPage === 1 ? null : await loadPage(1))
  return { pages: [firstPage, ...later], results, count: counted?.info.count ?? 0 }
}

// Each API page is its own cached (and retried) query, so overlapping UI pages never refetch one.
async function fetchWindow(
  queryClient: QueryClient,
  params: ApiFilterParams,
  plan: PagePlan,
): Promise<ApiWindow> {
  const loadPage: PageLoader = (page) =>
    queryClient.query({ ...apiPageQuery(params, page), staleTime: 'static' })
  const info = cachedInfo(queryClient, params)
  const { pages, results, count } = info
    ? await loadInRange(loadPage, plan, info)
    : await loadFirstThenRest(loadPage, plan)
  const characters = sliceApiWindow(
    plan,
    pages,
    results.map((result) => result?.results ?? null),
  )
  return { items: characters.map(toCharacterView), apiCount: count }
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
