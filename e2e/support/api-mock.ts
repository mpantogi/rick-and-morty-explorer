import { readFileSync } from 'node:fs'

import type { Page, Route } from '@playwright/test'
import { z } from 'zod'

import { apiCharacterSchema } from '../../src/entities/character/api/schemas.ts'
import { apiEpisodeSchema } from '../../src/entities/episode/api/schemas.ts'
import { type ApiReply, findByIds, listCharacters } from '../../test/api-semantics.ts'

const API_ORIGIN = 'https://rickandmortyapi.com'
const API_ROUTES = `${API_ORIGIN}/api/**`
export const LIST_URL = /\/api\/character(\?|$)/
export const FIRST_LIST_PAGE_URL = /\/api\/character\?page=1$/
export const NO_MATCH_URL = /\/api\/character\?name=zzzz&page=1$/
export const EPISODES_URL = /\/api\/episode\//

const AVATAR_PATH = /^\/api\/character\/avatar\/\d+\.jpeg$/
const LIST_PATH = '/api/character'
const BY_IDS_PATH = /^\/api\/(character|episode)\/([^/]+)$/
const NOT_IMPLEMENTED = 501
const AVATAR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
  '<rect width="300" height="300" fill="#9ca3af"/></svg>'
// The real API allows any origin; fulfilled responses still pass the browser's CORS check.
const CORS = { 'access-control-allow-origin': '*' }

const fixture = z
  .object({
    characters: z.array(apiCharacterSchema.loose()),
    episodes: z.array(apiEpisodeSchema.loose()),
  })
  .parse(JSON.parse(readFileSync(new URL('api-fixture.json', import.meta.url), 'utf8')))

function replyFor(url: URL): ApiReply {
  if (url.pathname === LIST_PATH) return listCharacters(fixture.characters, url)
  const [, resource, segment = ''] = BY_IDS_PATH.exec(url.pathname) ?? []
  if (resource === 'character') return findByIds(fixture.characters, segment, 'Character')
  if (resource === 'episode') return findByIds(fixture.episodes, segment, 'Episode')
  // Unmocked endpoints fail loudly instead of reaching the live API.
  return {
    status: NOT_IMPLEMENTED,
    body: { error: `The E2E API mock does not serve ${url.pathname}` },
  }
}

async function answer(route: Route): Promise<void> {
  const url = new URL(route.request().url())
  if (AVATAR_PATH.test(url.pathname)) {
    await route.fulfill({ contentType: 'image/svg+xml', body: AVATAR_SVG, headers: CORS })
    return
  }
  const { status, body } = replyFor(url)
  await route.fulfill({ status, json: body, headers: CORS })
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

// Holds every matching response until the returned function releases them.
export async function holdResponses(page: Page, url: RegExp): Promise<() => void> {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(url, async (route) => {
    await gate
    await route.fallback()
  })
  return release
}
