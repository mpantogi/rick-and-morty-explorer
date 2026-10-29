import { CancelledError, type Query, QueryCache, QueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'

import { ApiError, type ErrorCase, toErrorCase } from '@/shared/api'
import { reportError } from '@/shared/lib'

const MAX_RETRIES = 2
const GC_TIME_MS = 30 * 60_000

const TOAST_COPY: Record<
  Exclude<ErrorCase, 'not_found'>,
  { title: string; description: string }
> = {
  server: {
    title: "The Rick and Morty API isn't responding",
    description: "We'll keep what's on screen. Try again in a moment.",
  },
  unknown: {
    title: "Couldn't load data",
    description: 'Check your connection and try again.',
  },
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && error instanceof ApiError && error.isRetryable
}

// Regions show their own state; this adds one toast per case and reports contract drift and bugs.
// Unwatched queries (prefetches, a window's own pages) stay silent; the watched window reports.
function notifyQueryError(error: unknown, query: Query<unknown, unknown, unknown>): void {
  if (query.getObserversCount() === 0 || error instanceof CancelledError) return
  if (!(error instanceof ApiError)) reportError(error, 'query')
  else if (error.kind === 'parse') reportError(error, 'api-contract')
  const errorCase = toErrorCase(error)
  if (errorCase === 'not_found') return
  const { title, description } = TOAST_COPY[errorCase]
  toast.error(title, { id: `query-error:${errorCase}`, description })
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: notifyQueryError }),
    defaultOptions: {
      queries: {
        staleTime: 'static',
        gcTime: GC_TIME_MS,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        // Offline requests must fail into the error state instead of pausing forever.
        networkMode: 'always',
      },
    },
  })
}
