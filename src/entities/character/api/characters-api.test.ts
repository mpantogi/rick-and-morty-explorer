import { http } from 'msw/http'
import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'

import { API, apiJson } from '../../../../test/msw/handlers'
import { server } from '../../../../test/msw/server'
import { fetchCharacterPage } from './characters-api'

function captureListUrls(): string[] {
  const urls: string[] = []
  server.use(
    http.get(`${API}/character`, ({ request }) => {
      urls.push(request.url)
    }),
  )
  return urls
}

describe('fetchCharacterPage', () => {
  it('returns a parsed API page of 20 characters with the total count', async () => {
    const page = await fetchCharacterPage({}, 1)

    expect(page?.info).toMatchObject({ count: 25, pages: 2 })
    expect(page?.results).toHaveLength(20)
    expect(page?.results[0]).toMatchObject({ id: 1, name: 'Rick Sanchez', status: 'Alive' })
    expect(page?.results[0]).not.toHaveProperty('created')
  })

  it('sends the filters in their given order, then the page', async () => {
    const urls = captureListUrls()

    await fetchCharacterPage({ name: 'rick', status: 'alive' }, 2)

    expect(urls).toEqual([`${API}/character?name=rick&status=alive&page=2`])
  })

  it('returns null when no character matches, because the API answers 404', async () => {
    await expect(fetchCharacterPage({ name: 'zzzz' }, 1)).resolves.toBeNull()
  })

  it('returns null for a page past the last one', async () => {
    await expect(fetchCharacterPage({}, 3)).resolves.toBeNull()
  })

  it('rejects with the ApiError for any other failure', async () => {
    server.use(http.get(`${API}/character`, () => apiJson({ error: 'boom' }, 500)))

    await expect(fetchCharacterPage({}, 1)).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    })
    await expect(fetchCharacterPage({}, 1)).rejects.toBeInstanceOf(ApiError)
  })
})
