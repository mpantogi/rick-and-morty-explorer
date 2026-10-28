import { readFileSync } from 'node:fs'

import type { Page, Route } from '@playwright/test'
import { z } from 'zod'

import { apiCharacterSchema } from '../../src/entities/character/api/schemas.ts'
import { listCharacters } from '../../test/api-semantics.ts'

const API_ORIGIN = 'https://rickandmortyapi.com'
const API_ROUTES = `${API_ORIGIN}/api/**`
export const LIST_URL = /\/api\/character(\?|$)/
export const FIRST_LIST_PAGE_URL = /\/api\/character\?page=1$/
export const NO_MATCH_URL = /\/api\/character\?name=zzzz&page=1$/

const AVATAR_PATH = /^\/api\/character\/avatar\/\d+\.jpeg$/
const LIST_PATH = '/api/character'
const NOT_IMPLEMENTED = 501
const AVATAR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
  '<rect width="300" height="300" fill="#9ca3af"/></svg>'
// The real API allows any origin; fulfilled responses still pass the browser's CORS check.
const CORS = { 'access-control-allow-origin': '*' }

const fixture = z
  .object({ characters: z.array(apiCharacterSchema.loose()) })
  .parse(JSON.parse(readFileSync(new URL('api-fixture.json', import.meta.url), 'utf8')))

async function answer(route: Route): Promise<void> {
  const url = new URL(route.request().url())
  if (AVATAR_PATH.test(url.pathname)) {
    await route.fulfill({ contentType: 'image/svg+xml', body: AVATAR_SVG, headers: CORS })
    return
  }
  if (url.pathname === LIST_PATH) {
    const { status, body } = listCharacters(fixture.characters, url)
    await route.fulfill({ status, json: body, headers: CORS })
    return
  }
  // Unmocked endpoints fail loudly instead of reaching the live API.
  await route.fulfill({
    status: NOT_IMPLEMENTED,
    json: { error: `The E2E API mock does not serve ${url.pathname}` },
    headers: CORS,
  })
}

// Answers with an error the way the API would, for tests that exercise failure states.
export function failWith(status: number) {
  return (route: Route) => route.fulfill({ status, json: { error: 'Failure' }, headers: CORS })
}

// Records the app's JSON requests to the API; avatars are images, not data, so they never count.
export function trackApiCalls(page: Page): string[] {
  const calls: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.origin !== API_ORIGIN || AVATAR_PATH.test(url.pathname)) return
    calls.push(`${url.pathname}${url.search}`)
  })
  return calls
}

export async function mockApi(page: Page): Promise<void> {
  await page.route(API_ROUTES, answer)
}
