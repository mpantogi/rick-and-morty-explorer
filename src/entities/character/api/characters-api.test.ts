import { http } from 'msw/http'
import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'

import { CHARACTERS } from '../../../../test/fixtures/characters'
import { API, apiJson } from '../../../../test/msw/handlers'
import { recordRequests, server } from '../../../../test/msw/server'
import { fetchCharacter, fetchCharacterPage, fetchCharactersByIds } from './characters-api'

function serveMortyWithEpisodes(episode: string[]): void {
  const morty = CHARACTERS.find((record) => record.id === 2)
  if (!morty) throw new Error('No fixture character 2')
  server.use(http.get(`${API}/character/:ids`, () => apiJson({ ...morty, episode })))
}

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

describe('fetchCharactersByIds', () => {
  it('asks for the ids in the bracket form and gets a list even for one id', async () => {
    const paths = recordRequests('character/:ids')

    const characters = await fetchCharactersByIds([3])

    expect(paths).toEqual(['/api/character/[3]'])
    expect(characters.map((character) => character.name)).toEqual(['Summer Smith'])
  })

  it('returns the API order (sorted by id, without duplicates or missing ids)', async () => {
    const characters = await fetchCharactersByIds([266, 2, 99999, 1, 2])

    expect(characters.map((character) => character.id)).toEqual([1, 2, 266])
  })
})

describe('fetchCharacter', () => {
  it('returns one parsed character', async () => {
    await expect(fetchCharacter(2)).resolves.toMatchObject({ id: 2, name: 'Morty Smith' })
  })

  it('rejects with a not-found ApiError for an unknown id', async () => {
    await expect(fetchCharacter(99999)).rejects.toMatchObject({
      name: 'ApiError',
      isNotFound: true,
    })
  })

  it.each([
    ['a non-numeric id', 'https://rickandmortyapi.com/api/episode/abc'],
    ['a trailing slash', 'https://rickandmortyapi.com/api/episode/12/'],
    ['another resource', 'https://rickandmortyapi.com/api/location/3'],
  ])('rejects an episode URL with %s as a broken API contract', async (_, url) => {
    serveMortyWithEpisodes([url])

    await expect(fetchCharacter(2)).rejects.toMatchObject({ name: 'ApiError', kind: 'parse' })
  })
})
