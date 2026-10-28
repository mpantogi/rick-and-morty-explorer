import { http, HttpResponse } from 'msw/http'

import { type ApiReply, findByIds, listCharacters } from '../api-semantics'
import { CHARACTERS } from '../fixtures/characters'
import { EPISODES } from '../fixtures/episodes'

export const API = 'https://rickandmortyapi.com/api'

export function apiJson(body: ApiReply['body'], status = 200): Response {
  return HttpResponse.json(body, { status })
}

function lastSegment(request: Request): string {
  return new URL(request.url).pathname.split('/').at(-1) ?? ''
}

export const handlers = [
  http.get(`${API}/character`, ({ request }) => {
    const { body, status } = listCharacters(CHARACTERS, new URL(request.url))
    return apiJson(body, status)
  }),
  http.get(`${API}/character/:ids`, ({ request }) => {
    const { body, status } = findByIds(CHARACTERS, lastSegment(request), 'Character')
    return apiJson(body, status)
  }),
  http.get(`${API}/episode/:ids`, ({ request }) => {
    const { body, status } = findByIds(EPISODES, lastSegment(request), 'Episode')
    return apiJson(body, status)
  }),
]
