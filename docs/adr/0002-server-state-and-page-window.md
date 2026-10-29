# 0002. Server state and the 12-over-20 page window

Status: accepted

## Context

- The task asks for 12 characters per page. The API serves fixed pages of 20, filters on the
  server, and answers 404 when a filter matches nothing or a page is past the end.
- Created heroes lead the list and follow the same filters, so the API's share of each page
  depends on how many heroes match.
- API responses are `public, max-age=7776000, immutable`, and the data has not changed since 2021.
  The app should behave like a business-critical site with heavy traffic, so it must never repeat
  a request it can answer from memory.

## Decision

- TanStack Vue Query holds all server state. Every query is built with `queryOptions` from key
  factories (`characterKeys`, `episodeKeys`).
- QueryClient defaults (`src/app/providers/query-client.ts`): `staleTime: 'static'` (vue-query
  5.105 accepts it in `defaultOptions`, so cached data never goes stale), `gcTime` 30 minutes,
  `refetchOnWindowFocus: false`, and `networkMode: 'always'` so an offline request fails into the
  error state instead of pausing. `retry` allows two retries, only for network errors, timeouts,
  429 and 5xx.
- Each API page is its own cached query (`characterQueries.apiPage`). A UI page is a window query:
  `planPage(uiPage, heroCount)` puts the matching heroes first, maps the rest onto an API range and
  the one or two API pages that cover it, and `sliceApiWindow` cuts the 12 items out.
- Only leaf queries retry. The window query has `retry: false`, so a failing page is tried three
  times, not three times per window attempt, and the region shows its error after about 3 s.
- Loading API pages: when a cached page for the same filters already gives the page count, every
  in-range page is requested in parallel. Otherwise the first planned page goes first and the rest
  follow, so no request goes past the last page.
- `placeholderData: keepPreviousData` keeps the previous page on screen, marked as updating. The
  next UI page is prefetched once the current one is ready, and a detail page starts from the
  character the list or the favorites already cached (`initialData`).
- `QueryCache.onError` raises one toast per error case (deduplicated by id) and stays silent for
  404s and cancellations. Each region renders its own error with a retry.
- `queryClient.query` replaces `ensureQueryData`, `fetchQuery` and `prefetchQuery`, which are
  deprecated in vue-query 5.105.

## Consequences

- Paging back and forth, or opening overlapping windows, never repeats a request in a session.
- A cold deep link (nothing cached, for example `/?page=9&name=rick`) costs two sequential round
  trips: the first page for the count, then the rest. A page past the end costs a 404 plus a
  request for page 1. Accepted, because guessing pages in parallel would request pages that 404.
- Cancelling a window query does not abort the API page requests it started: they finish and fill
  the cache. Every leaf query passes its own `AbortSignal` to `fetch`.
- Data is never refetched within a session; a new deploy picks up any upstream change.
