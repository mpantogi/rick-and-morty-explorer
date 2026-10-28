import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { toast } from 'vue-sonner'

import { STORAGE_KEYS } from '@/shared/config'

import type { Hero, HeroInput } from './hero-schema'
import { useHeroesStore } from './heroes-store'

const KEY = STORAGE_KEYS.heroes
const MAX_HEROES = 500
const NOW = new Date('2026-10-28T12:00:00.000Z')
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const PETE: HeroInput = {
  name: 'Portal Pete',
  gender: 'male',
  image: 'https://example.com/pete.png',
}
const PAM: HeroInput = {
  name: 'Plasma Pam',
  gender: 'female',
  image: 'https://example.com/pam.png',
}

function storedHero(overrides: Partial<Hero> = {}): Hero {
  return { ...PETE, id: crypto.randomUUID(), createdAt: NOW.toISOString(), ...overrides }
}

function freshStore() {
  setActivePinia(createPinia())
  return useHeroesStore()
}

function stored(): unknown {
  return JSON.parse(localStorage.getItem(KEY) ?? 'null')
}

describe('useHeroesStore', () => {
  // Dropped entries are reported to the console in development builds.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts empty without writing anything to storage', () => {
    const heroes = freshStore()

    expect(heroes.heroes).toEqual([])
    expect(heroes.views).toEqual([])
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('creates a hero with a uuid and the creation time, and saves it', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
    const heroes = freshStore()

    const hero = heroes.add(PETE)

    expect(hero).toEqual({ ...PETE, id: expect.stringMatching(UUID), createdAt: NOW.toISOString() })
    await nextTick()
    expect(stored()).toEqual([hero])
  })

  it('puts the newest hero first and lists them as character views', () => {
    const heroes = freshStore()

    const pete = heroes.add(PETE)
    const pam = heroes.add(PAM)

    expect(heroes.heroes).toEqual([pam, pete])
    expect(heroes.views.map((view) => [view.key, view.name, view.source])).toEqual([
      [`hero:${String(pam?.id)}`, 'Plasma Pam', 'hero'],
      [`hero:${String(pete?.id)}`, 'Portal Pete', 'hero'],
    ])
  })

  it('reads saved heroes back in a new session', async () => {
    const hero = freshStore().add(PETE)
    await nextTick()

    expect(freshStore().heroes).toEqual([hero])
  })

  it('keeps the valid heroes of tampered storage and drops the rest', () => {
    const valid = storedHero()
    const tampered = [
      valid,
      storedHero({ image: 'javascript:alert(1)' }),
      { ...storedHero(), id: 'not-a-uuid' },
      'hero',
    ]
    localStorage.setItem(KEY, JSON.stringify(tampered))

    expect(freshStore().heroes).toEqual([valid])
  })

  it('falls back to no heroes when storage holds corrupt JSON', () => {
    localStorage.setItem(KEY, '[{')

    expect(freshStore().heroes).toEqual([])
  })

  it('refuses a new hero at the cap and keeps the saved ones', () => {
    const full = Array.from({ length: MAX_HEROES }, () => storedHero())
    localStorage.setItem(KEY, JSON.stringify(full))
    const heroes = freshStore()

    expect(heroes.add(PAM)).toBeNull()
    expect(heroes.heroes).toHaveLength(MAX_HEROES)
    expect(heroes.heroes.some((hero) => hero.name === PAM.name)).toBe(false)
  })

  it('follows changes made in another tab, validated like a read', async () => {
    const heroes = freshStore()
    const fromOtherTab = storedHero({ name: 'Tab Two' })

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: KEY,
        newValue: JSON.stringify([fromOtherTab, { name: 'bogus' }]),
        storageArea: localStorage,
      }),
    )
    await nextTick()

    expect(heroes.heroes).toEqual([fromOtherTab])
  })

  it('reports a failed save with a toast and keeps the hero for this visit', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 'id')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })
    const heroes = freshStore()

    heroes.add(PETE)
    await nextTick()

    expect(heroes.heroes).toHaveLength(1)
    expect(toastError).toHaveBeenCalledWith("Couldn't save in this browser", {
      id: 'storage-error',
      description: 'Storage is full or blocked.',
    })
  })
})
