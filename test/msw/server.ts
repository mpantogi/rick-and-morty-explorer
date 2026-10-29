import { http } from 'msw/http'
import { setupServer } from 'msw/node'

import { API, handlers } from './handlers'

export const server = setupServer(...handlers)

// Records the decoded path and query of every matching request, then lets the handlers answer it.
export function recordRequests(route = '*'): string[] {
  const seen: string[] = []
  server.use(
    http.get(`${API}/${route}`, ({ request }) => {
      const url = new URL(request.url)
      seen.push(decodeURIComponent(`${url.pathname}${url.search}`))
    }),
  )
  return seen
}

// Holds every list response until released, so in-between states can be observed.
export function holdListResponses(): () => void {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.get(`${API}/character`, async () => {
      await gate
    }),
  )
  return release
}
