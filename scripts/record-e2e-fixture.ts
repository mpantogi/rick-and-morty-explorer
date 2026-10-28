// Records characters 1–60 and every episode they appear in from the live API, in two bulk
// requests, so the E2E suite runs offline against real data. Re-run only to refresh the fixture.
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { z } from 'zod'

const API = 'https://rickandmortyapi.com/api'
const CHARACTER_COUNT = 60
const OUTPUT = resolve(import.meta.dirname, '..', 'e2e', 'support', 'api-fixture.json')
const EPISODE_ID = /\/episode\/(\d+)$/

const characterListSchema = z.array(z.looseObject({ id: z.int(), episode: z.array(z.string()) }))
const episodeListSchema = z.array(z.looseObject({ id: z.int() }))

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`GET ${path} answered ${String(response.status)}`)
  return response.json()
}

function idList(ids: readonly number[]): string {
  return `[${ids.join(',')}]`
}

const characterIds = Array.from({ length: CHARACTER_COUNT }, (_, index) => index + 1)
const characters = characterListSchema.parse(await getJson(`/character/${idList(characterIds)}`))
if (characters.length !== CHARACTER_COUNT) {
  throw new Error(
    `Expected ${String(CHARACTER_COUNT)} characters, got ${String(characters.length)}`,
  )
}

const episodeIds = [
  ...new Set(
    characters.flatMap((character) =>
      character.episode.flatMap((url) => {
        const id = EPISODE_ID.exec(url)?.[1]
        return id === undefined ? [] : [Number(id)]
      }),
    ),
  ),
].toSorted((a, b) => a - b)
const episodes = episodeListSchema.parse(await getJson(`/episode/${idList(episodeIds)}`))

await writeFile(OUTPUT, `${JSON.stringify({ characters, episodes }, null, 2)}\n`)
process.stdout.write(
  `Wrote ${String(characters.length)} characters and ${String(episodes.length)} episodes to ${OUTPUT}\n`,
)
