// The Rick and Morty API's documented and observed behaviour over fixture data, shared by the MSW
// handlers (Vitest) and the Playwright API mock. Relative imports keep it loadable from e2e/.
import type { ApiCharacter } from '../src/entities/character/api/schemas'
import { matchesFilters } from '../src/entities/character/model/filters'

const PAGE_SIZE = 20
const NOT_FOUND = { error: 'There is nothing here' }

type Filterable = Pick<ApiCharacter, 'name' | 'status' | 'species' | 'type' | 'gender'>

export interface ApiReply {
  status: number
  body: Record<string, unknown> | unknown[]
}

// Invalid page values fall back to page 1, as on the real API.
function pageOf(url: URL): number {
  const page = Number(url.searchParams.get('page'))
  return Number.isInteger(page) && page > 0 ? page : 1
}

function pageUrl(url: URL, page: number): string {
  const next = new URL(url)
  next.searchParams.set('page', String(page))
  return next.href
}

// Empty results and pages past the last one are a 404, never an empty 200.
export function listCharacters(characters: readonly Filterable[], url: URL): ApiReply {
  const param = (name: string) => url.searchParams.get(name) ?? ''
  const filters = {
    name: param('name'),
    status: param('status'),
    species: param('species'),
    type: param('type'),
    gender: param('gender'),
  }
  const matches = characters.filter((character) => matchesFilters(character, filters))
  const page = pageOf(url)
  const results = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  if (results.length === 0) return { status: 404, body: NOT_FOUND }

  const pages = Math.ceil(matches.length / PAGE_SIZE)
  return {
    status: 200,
    body: {
      info: {
        count: matches.length,
        pages,
        next: page < pages ? pageUrl(url, page + 1) : null,
        prev: page > 1 ? pageUrl(url, page - 1) : null,
      },
      results,
    },
  }
}

const BRACKETS = /^\[|\]$/g

// `/x/[1,2]` and `/x/1,2` answer a list sorted by id, deduplicated and without missing ids;
// `/x/1` answers the record itself, or a 404 when it does not exist.
export function findByIds(
  records: readonly { id: number }[],
  segment: string,
  resource: string,
): ApiReply {
  const decoded = decodeURIComponent(segment)
  const ids = new Set(decoded.replace(BRACKETS, '').split(',').map(Number))
  const found = records.filter((record) => ids.has(record.id)).toSorted((a, b) => a.id - b.id)
  if (decoded.startsWith('[') || decoded.includes(',')) return { status: 200, body: found }
  const [record] = found
  return record
    ? { status: 200, body: { ...record } }
    : { status: 404, body: { error: `${resource} not found` } }
}
