import { useQuery } from '@tanstack/vue-query'
import { http } from 'msw/http'
import { describe, expect, it } from 'vitest'

import { API, apiJson } from './msw/handlers'
import { server } from './msw/server'
import { renderComposable } from './render'

// The second test checks what the first one leaves running, so their order matters.
describe('teardown between tests', () => {
  it('ends while a query of its own is still fetching', async () => {
    const { queryClient } = await renderComposable(() =>
      useQuery({
        queryKey: ['in-flight'],
        queryFn: async () => (await fetch(`${API}/character?page=2`)).json(),
      }),
    )

    expect(queryClient.isFetching()).toBe(1)
  })

  it("never lets the previous test's request reach this test's handlers", async () => {
    const seen: string[] = []
    server.use(
      http.get(
        `${API}/character`,
        ({ request }) => {
          seen.push(new URL(request.url).search)
          return apiJson({ error: 'boom' }, 500)
        },
        { once: true },
      ),
    )

    await fetch(`${API}/character?page=1`)

    expect(seen).toEqual(['?page=1'])
  })
})
