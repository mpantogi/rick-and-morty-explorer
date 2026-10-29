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

class FixtureError extends Error {
  override readonly name = 'FixtureError'
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`GET ${path} answered ${String(response.status)}`)
  return response.json()
}

function idList(ids: readonly number[]): string {
  return `[${ids.join(',')}]`
}

function episodeId(url: string): number {
  const id = EPISODE_ID.exec(url)?.[1]
  if (id === undefined) throw new FixtureError(`Unexpected episode URL: ${url}`)
  return Number(id)
}

// The API drops unknown ids and answers sorted by id, so anything but the requested list is wrong.
function assertIds(label: string, records: readonly { id: number }[], requested: number[]): void {
  const received = idList(records.map(({ id }) => id))
  if (received !== idList(requested)) {
    throw new FixtureError(`Asked for ${label} ${idList(requested)}, got ${received}`)
  }
}

const characterIds = Array.from({ length: CHARACTER_COUNT }, (_, index) => index + 1)
const characters = characterListSchema.parse(await getJson(`/character/${idList(characterIds)}`))
assertIds('characters', characters, characterIds)

const episodeIds = [
  ...new Set(characters.flatMap((character) => character.episode.map(episodeId))),
].toSorted((a, b) => a - b)
const episodes = episodeListSchema.parse(await getJson(`/episode/${idList(episodeIds)}`))
assertIds('episodes', episodes, episodeIds)

await writeFile(OUTPUT, `${JSON.stringify({ characters, episodes }, null, 2)}\n`)
process.stdout.write(
  `Wrote ${String(characters.length)} characters and ${String(episodes.length)} episodes to ${OUTPUT}\n`,
)
