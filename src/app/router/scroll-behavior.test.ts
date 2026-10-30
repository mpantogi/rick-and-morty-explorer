import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { PAGE_LINK_STATE } from '@/features/character-filters'

import { routes } from './routes'
import { scrollBehavior } from './scroll-behavior'

const router = createRouter({ history: createMemoryHistory(), routes })

async function locationAt(path: string) {
  await router.push(path)
  return router.currentRoute.value
}

async function scrollFor(
  to: string,
  from: string,
  saved: { left: number; top: number } | null = null,
) {
  const fromLocation = await locationAt(from)
  return scrollBehavior(await locationAt(to), fromLocation, saved)
}

const RESULTS_SCROLL = { el: '#results', top: 0 }

function arriveThroughPageLink(): void {
  window.history.replaceState(PAGE_LINK_STATE, '')
}

describe('scrollBehavior', () => {
  afterEach(() => {
    window.history.replaceState(null, '')
  })

  it('restores the saved position on back and forward navigation', async () => {
    expect(await scrollFor('/?page=2', '/', { left: 0, top: 640 })).toEqual({ left: 0, top: 640 })
  })

  it('scrolls to the anchor named in the hash', async () => {
    expect(await scrollFor('/#main', '/nope')).toEqual({ el: '#main' })
  })

  it('scrolls to the results when a page link changes the URL', async () => {
    arriveThroughPageLink()

    expect(await scrollFor('/?name=rick&page=3', '/?name=rick&page=2')).toEqual(RESULTS_SCROLL)
    expect(await scrollFor('/', '/?page=2')).toEqual(RESULTS_SCROLL)
  })

  it('keeps the scroll position when a link repeats the URL of a page link entry', async () => {
    arriveThroughPageLink()

    expect(await scrollFor('/', '/')).toBe(false)
  })

  it.each([
    ['/', '/?page=2'],
    ['/', '/?page=1'],
    ['/?name=morty', '/?name=rick&page=2'],
    ['/?name=rick', '/?name=rick&page=2'],
    ['/?name=rick', '/'],
  ])('keeps the scroll position when %s follows %s without a page link', async (to, from) => {
    expect(await scrollFor(to, from)).toBe(false)
  })

  it('scrolls to the top for any other navigation', async () => {
    expect(await scrollFor('/nope', '/')).toEqual({ top: 0 })
    expect(await scrollFor('/', '/nope')).toEqual({ top: 0 })
  })
})
