import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { renderComposable } from '../../../../test/render'
import { useCharacterFilters } from './use-character-filters'

const DEBOUNCE_MS = 300

async function setup(route = '/') {
  const rendered = await renderComposable(useCharacterFilters, { route })
  const replace = vi.spyOn(rendered.router, 'replace')
  const push = vi.spyOn(rendered.router, 'push')
  const query = () => rendered.router.currentRoute.value.query
  return { ...rendered, controller: rendered.result, replace, push, query }
}

describe('useCharacterFilters', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads the applied filters, the page and the active count from the URL', async () => {
    const { controller } = await setup('/?name=rick&status=alive&page=2')

    expect(controller.filters.value).toEqual({
      name: 'rick',
      status: 'alive',
      species: '',
      type: '',
      gender: '',
    })
    expect(controller.page.value).toBe(2)
    expect(controller.draft).toEqual(controller.filters.value)
    expect(controller.activeCount.value).toBe(2)
  })

  it('applies typed text 300 ms after the last keystroke, on page 1, replacing history', async () => {
    const { controller, query, replace, push } = await setup('/?page=3')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    controller.update('name', 'r')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 100)
    controller.update('name', 'rick')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1)

    expect(query()).toEqual({ page: '3' })

    await vi.advanceTimersByTimeAsync(1)

    await vi.waitFor(() => {
      expect(query()).toEqual({ name: 'rick' })
    })
    expect(replace).toHaveBeenCalledOnce()
    expect(push).not.toHaveBeenCalled()
  })

  it.each([
    ['status', 'dead'],
    ['gender', 'genderless'],
  ] as const)('applies a %s choice at once', async (field, value) => {
    const { controller, query } = await setup()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    controller.update(field, value)
    await vi.advanceTimersByTimeAsync(0)

    expect(query()).toEqual({ [field]: value })
  })

  it('flushes pending text on submit without applying it twice', async () => {
    const { controller, query, replace } = await setup()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    controller.update('name', 'morty')
    controller.applyNow()
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    await vi.waitFor(() => {
      expect(query()).toEqual({ name: 'morty' })
    })
    expect(replace).toHaveBeenCalledOnce()
  })

  it('normalises the draft before writing the URL', async () => {
    const { controller, query } = await setup('/?name=rick&page=4')

    controller.update('name', '  morty  ')
    controller.update('species', 'Alien')
    controller.applyNow()

    await vi.waitFor(() => {
      expect(query()).toEqual({ name: 'morty', species: 'Alien' })
    })
  })

  it('copies the URL back into the draft on back navigation', async () => {
    const { controller, router } = await setup('/?name=rick')
    await router.push('/?name=morty&gender=male')
    expect(controller.draft).toMatchObject({ name: 'morty', gender: 'male' })

    router.back()

    await vi.waitFor(() => {
      expect(controller.draft).toMatchObject({ name: 'rick', gender: '' })
    })
  })

  it('keeps the spaces the visitor typed after the trimmed text reaches the URL', async () => {
    const { controller, query } = await setup()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    controller.update('name', 'rick ')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    await vi.waitFor(() => {
      expect(query()).toEqual({ name: 'rick' })
    })
    await nextTick()
    expect(controller.draft.name).toBe('rick ')

    controller.update('name', 'rick san')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    await vi.waitFor(() => {
      expect(query()).toEqual({ name: 'rick san' })
    })
  })

  it('keeps pending text as typed when an option applies it at once', async () => {
    const { controller, query } = await setup()

    controller.update('species', ' alien ')
    controller.update('status', 'alive')

    await vi.waitFor(() => {
      expect(query()).toEqual({ species: 'alien', status: 'alive' })
    })
    await nextTick()
    expect(controller.draft.species).toBe(' alien ')
  })

  it('keeps text the visitor is still typing when the URL changes', async () => {
    const { controller, router } = await setup()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    controller.update('name', 'summ')
    await router.push('/?status=alive')

    expect(controller.draft.name).toBe('summ')
  })

  it('clears the draft, any pending text and the URL on reset', async () => {
    const { controller, query, replace } = await setup('/?name=rick&gender=male&page=2')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    controller.update('type', 'clone')
    controller.reset()
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    await vi.waitFor(() => {
      expect(query()).toEqual({})
    })
    expect(controller.draft).toEqual({ name: '', status: '', species: '', type: '', gender: '' })
    expect(replace).toHaveBeenCalledOnce()
  })

  it('rewrites a non-canonical URL once mounted', async () => {
    const { router } = await setup('/?page=0&status=al&name=%20rick%20&foo=bar')

    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/?name=rick')
    })
  })

  it('links other pages with the applied filters', async () => {
    const { controller } = await setup('/?name=rick&page=2')

    expect(controller.pageLink(3)).toEqual({ query: { name: 'rick', page: '3' } })
    expect(controller.pageLink(1)).toEqual({ query: { name: 'rick' } })
  })
})
