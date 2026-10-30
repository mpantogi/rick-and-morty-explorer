import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/vue'
import { afterAll, afterEach, beforeAll } from 'vitest'

import '@/shared/zod'

import { server } from './msw/server'
import { settleQueries } from './settle-queries'

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  // jsdom does no layout, so it leaves scrolling out; listboxes, the heading and the header call it.
  Element.prototype.scrollIntoView = () => undefined
  window.scrollTo = () => undefined
})

afterEach(async () => {
  await settleQueries()
  cleanup()
  server.resetHandlers()
  localStorage.clear()
})

afterAll(() => {
  server.close()
})
