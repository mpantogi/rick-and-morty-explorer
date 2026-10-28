import { describe, expect, it } from 'vitest'

import { apiKey } from './character-key'
import { buildListPage, planPage, sliceApiWindow, totalPagesFor } from './pagination'
import type { CharacterView } from './types'

const API_PAGE_SIZE = 20

function view(id: number): CharacterView {
  return {
    key: apiKey(id),
    source: 'api',
    name: `Character ${String(id)}`,
    status: 'alive',
    species: 'Human',
    type: '',
    gender: 'male',
    image: `https://rickandmortyapi.com/api/character/avatar/${String(id)}.jpeg`,
    origin: 'unknown',
    location: 'unknown',
    episodeIds: [1],
    href: `/characters/${String(id)}`,
  }
}

function views(first: number, last: number): CharacterView[] {
  return Array.from({ length: last - first + 1 }, (_, index) => view(first + index))
}

// Item ids of one API page out of `count` characters, 20 per page.
function apiPage(page: number, count: number): number[] {
  const first = (page - 1) * API_PAGE_SIZE + 1
  const last = Math.min(page * API_PAGE_SIZE, count)
  return first > last ? [] : Array.from({ length: last - first + 1 }, (_, i) => first + i)
}

describe('planPage', () => {
  it.each([
    { uiPage: 1, local: 0, localRange: [0, 0], apiRange: [0, 12], apiPages: [1] },
    { uiPage: 1, local: 3, localRange: [0, 3], apiRange: [0, 9], apiPages: [1] },
    { uiPage: 1, local: 12, localRange: [0, 12], apiRange: [0, 0], apiPages: [] },
    { uiPage: 1, local: 15, localRange: [0, 12], apiRange: [0, 0], apiPages: [] },
    { uiPage: 2, local: 15, localRange: [12, 15], apiRange: [0, 9], apiPages: [1] },
    { uiPage: 2, local: 0, localRange: [0, 0], apiRange: [12, 24], apiPages: [1, 2] },
    { uiPage: 69, local: 0, localRange: [0, 0], apiRange: [816, 828], apiPages: [41, 42] },
    { uiPage: 70, local: 0, localRange: [0, 0], apiRange: [828, 840], apiPages: [42] },
    { uiPage: 100, local: 0, localRange: [0, 0], apiRange: [1188, 1200], apiPages: [60] },
    { uiPage: 9, local: 0, localRange: [0, 0], apiRange: [96, 108], apiPages: [5, 6] },
  ])(
    'page $uiPage with $local local heroes needs API pages $apiPages',
    ({ uiPage, local, localRange, apiRange, apiPages }) => {
      const plan = planPage(uiPage, local)

      expect([plan.local.start, plan.local.end]).toEqual(localRange)
      expect([plan.api.start, plan.api.end]).toEqual(apiRange)
      expect(plan.apiPages).toEqual(apiPages)
    },
  )
})

describe('sliceApiWindow', () => {
  it('takes the second half of page 1 and the start of page 2 for UI page 2', () => {
    const items = sliceApiWindow(planPage(2, 0), [1, 2], [apiPage(1, 826), apiPage(2, 826)])

    expect(items).toEqual([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24])
  })

  it('returns the 10 characters left on the last UI page of 826', () => {
    const items = sliceApiWindow(planPage(69, 0), [41, 42], [apiPage(41, 826), apiPage(42, 826)])

    expect(items).toEqual([817, 818, 819, 820, 821, 822, 823, 824, 825, 826])
  })

  it('fills page 9 of the 107 Ricks from API pages 5 and 6', () => {
    const items = sliceApiWindow(planPage(9, 0), [5, 6], [apiPage(5, 107), apiPage(6, 107)])

    expect(items).toHaveLength(11)
    expect(items.at(0)).toBe(97)
    expect(items.at(-1)).toBe(107)
  })

  it('treats a missing API page as empty', () => {
    const items = sliceApiWindow(planPage(9, 0), [5, 6], [apiPage(5, 107), null])

    expect(items).toEqual([97, 98, 99, 100])
  })

  it('takes nothing from the API when local heroes fill the page', () => {
    expect(sliceApiWindow(planPage(1, 12), [1], [apiPage(1, 826)])).toEqual([])
  })

  it('returns nothing past the last API item', () => {
    expect(sliceApiWindow(planPage(70, 0), [42], [apiPage(42, 826)])).toEqual([])
  })
})

describe('totalPagesFor', () => {
  it.each([
    [0, 1],
    [1, 1],
    [12, 1],
    [13, 2],
    [826, 69],
  ])('%i items make %i UI pages', (items, pages) => {
    expect(totalPagesFor(items)).toBe(pages)
  })
})

describe('buildListPage', () => {
  it('describes the first page of the full list', () => {
    const page = buildListPage(1, [], { items: views(1, 12), apiCount: 826 })

    expect(page).toMatchObject({
      total: 826,
      totalPages: 69,
      rangeStart: 1,
      rangeEnd: 12,
      outOfRange: false,
    })
    expect(page.items.map((item) => item.key)).toEqual(views(1, 12).map((item) => item.key))
  })

  it('ranges the short last page', () => {
    const page = buildListPage(69, [], { items: views(817, 826), apiCount: 826 })

    expect(page).toMatchObject({ rangeStart: 817, rangeEnd: 826, outOfRange: false })
  })

  it('puts the local matches first and counts them in the total', () => {
    const local = [view(9001), view(9002), view(9003)]
    const page = buildListPage(1, local, { items: views(1, 9), apiCount: 826 })

    expect(page.items.slice(0, 3)).toEqual(local)
    expect(page.items).toHaveLength(12)
    expect(page).toMatchObject({ total: 829, totalPages: 70, rangeStart: 1, rangeEnd: 12 })
  })

  it('marks a page past the last one as out of range', () => {
    expect(buildListPage(70, [], { items: [], apiCount: 826 })).toMatchObject({
      items: [],
      totalPages: 69,
      outOfRange: true,
    })
  })

  it('does not call an empty result out of range', () => {
    expect(buildListPage(3, [], { items: [], apiCount: 0 })).toMatchObject({
      total: 0,
      totalPages: 1,
      outOfRange: false,
    })
  })
})
