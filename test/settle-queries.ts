import type { QueryClient } from '@tanstack/vue-query'
import { expect, vi } from 'vitest'

const SETTLE_TIMEOUT_MS = 5_000
const clientsInUse = new Set<QueryClient>()

export function trackQueryClient(client: QueryClient): void {
  clientsInUse.add(client)
}

// MSW reaches a request a few event-loop turns after fetch(), so one still running when a test
// ends would meet the next test's handlers. Teardown waits until every client is idle.
export async function settleQueries(): Promise<void> {
  try {
    await vi.waitFor(
      () => {
        for (const client of clientsInUse) {
          expect(client.isFetching(), 'a query was still fetching when the test ended').toBe(0)
        }
      },
      { timeout: SETTLE_TIMEOUT_MS },
    )
  } finally {
    clientsInUse.clear()
  }
}
