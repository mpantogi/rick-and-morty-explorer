import { NO_MATCH_URL } from './api-mock'

export interface AppRoute {
  name: string
  path: string
  // Responses the route causes on purpose, tolerated by the console guard.
  expectedHttpErrors: RegExp[]
  // Visible once the page has settled into the state under test.
  settled: string
}

export const ROUTES: readonly AppRoute[] = [
  { name: 'home', path: '/', expectedHttpErrors: [], settled: '#results [data-state="ready"]' },
  {
    name: 'home without matches',
    path: '/?name=zzzz',
    expectedHttpErrors: [NO_MATCH_URL],
    settled: '#results [data-state="empty"]',
  },
  { name: 'not found', path: '/nope', expectedHttpErrors: [/\/nope$/], settled: '#page-title' },
]
