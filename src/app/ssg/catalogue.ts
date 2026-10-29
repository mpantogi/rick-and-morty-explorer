import {
  type ApiCharacter,
  fetchCharacterPage,
  fetchCharactersByIds,
  toCharacterView,
} from '@/entities/character'
import { type ApiEpisode, fetchEpisodesByIds } from '@/entities/episode'

export class CatalogueError extends Error {
  override readonly name = 'CatalogueError'
}

interface Catalogue {
  readonly characters: ReadonlyMap<number, ApiCharacter>
  readonly episodes: ReadonlyMap<number, ApiEpisode>
}

function idsUpTo(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1)
}

// Three bulk requests per build: the count, every character, every episode they appear in.
async function load(): Promise<Catalogue> {
  const count = (await fetchCharacterPage({}, 1))?.info.count ?? 0
  if (count === 0) throw new CatalogueError('the API lists no characters; nothing to prerender')
  const characters = await fetchCharactersByIds(idsUpTo(count))
  // GUARD: ids are 1..N since 2021; paging through the list is the root fix if that changes.
  if (characters.length !== count) {
    throw new CatalogueError('character ids are not contiguous 1..N; prerender would miss pages')
  }
  const episodeIds = [
    ...new Set(characters.flatMap((character) => toCharacterView(character).episodeIds)),
  ].sort((a, b) => a - b)
  const episodes = await fetchEpisodesByIds(episodeIds)
  return {
    characters: new Map(characters.map((character) => [character.id, character])),
    episodes: new Map(episodes.map((episode) => [episode.id, episode])),
  }
}

let catalogue: Promise<Catalogue> | undefined

// vite-ssg renders every route in this one process, so they all share the first load.
export function loadCatalogue(): Promise<Catalogue> {
  catalogue ??= load()
  return catalogue
}
