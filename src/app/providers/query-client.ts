import { QueryClient } from '@tanstack/vue-query'

import { ApiError } from '@/shared/api'

const MAX_RETRIES = 2
const GC_TIME_MS = 30 * 60_000

function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && error instanceof ApiError && error.isRetryable
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
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
