import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/vue'
import { afterAll, afterEach, beforeAll } from 'vitest'

import '@/shared/zod'

import { server } from './msw/server'
import { settleQueries } from './settle-queries'

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
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
