import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

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

describe('scrollBehavior', () => {
  it('restores the saved position on back and forward navigation', async () => {
    expect(await scrollFor('/?page=2', '/', { left: 0, top: 640 })).toEqual({ left: 0, top: 640 })
  })

  it('scrolls to the anchor named in the hash', async () => {
    expect(await scrollFor('/#main', '/nope')).toEqual({ el: '#main' })
  })

  it('scrolls to the results when only the home page number changes', async () => {
    expect(await scrollFor('/?name=rick&page=3', '/?name=rick&page=2')).toEqual({
      el: '#results',
      top: 0,
    })
    expect(await scrollFor('/?status=alive&name=rick&page=2', '/?name=rick&status=alive')).toEqual({
      el: '#results',
      top: 0,
    })
  })

  it('keeps the scroll position when the home filters change', async () => {
    expect(await scrollFor('/?name=morty', '/?name=rick&page=2')).toBe(false)
    expect(await scrollFor('/?name=rick', '/')).toBe(false)
  })

  it('scrolls to the top for any other navigation', async () => {
    expect(await scrollFor('/nope', '/')).toEqual({ top: 0 })
    expect(await scrollFor('/', '/nope')).toEqual({ top: 0 })
  })
})
