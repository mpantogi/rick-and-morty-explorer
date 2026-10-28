import { http, HttpResponse } from 'msw/http'

import { listCharacters } from '../api-semantics'
import { CHARACTERS } from '../fixtures/characters'

export const API = 'https://rickandmortyapi.com/api'

export function apiJson(body: Record<string, unknown>, status = 200): Response {
  return HttpResponse.json(body, { status })
}

export const handlers = [
  http.get(`${API}/character`, ({ request }) => {
    const { body, status } = listCharacters(CHARACTERS, new URL(request.url))
    return apiJson(body, status)
  }),
]
