import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { toast } from 'vue-sonner'

import { STORAGE_KEYS } from '@/shared/config'

import { useFavoritesStore } from './favorites-store'

const KEY = STORAGE_KEYS.favorites
const MAX_FAVORITES = 2000

function freshStore() {
  setActivePinia(createPinia())
  return useFavoritesStore()
}

function stored(): unknown {
  return JSON.parse(localStorage.getItem(KEY) ?? 'null')
}

describe('useFavoritesStore', () => {
  // Dropped entries are reported to the console in development builds.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('starts empty without writing anything to storage', () => {
    const favorites = freshStore()

    expect(favorites.keys).toEqual([])
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('puts the newest favorite first and removes one on a second toggle', async () => {
    const favorites = freshStore()

    expect(favorites.toggle('api:1')).toBe(true)
    expect(favorites.toggle('api:2')).toBe(true)
    expect(favorites.keys).toEqual(['api:2', 'api:1'])
    expect(favorites.isFavorite('api:1')).toBe(true)

    expect(favorites.toggle('api:1')).toBe(true)
    expect(favorites.keys).toEqual(['api:2'])
    expect(favorites.isFavorite('api:1')).toBe(false)
    await nextTick()
    expect(stored()).toEqual(['api:2'])
  })

  it('reads saved favorites back in a new session', async () => {
    freshStore().toggle('api:7')
    await nextTick()

    expect(freshStore().keys).toEqual(['api:7'])
  })

  it('keeps the valid keys of tampered storage and drops the rest', () => {
    localStorage.setItem(KEY, JSON.stringify(['api:3', 'api:0', 42, '<script>', 'api:3', 'api:5']))

    expect(freshStore().keys).toEqual(['api:3', 'api:5'])
  })

  it('falls back to no favorites when storage holds corrupt JSON', () => {
    localStorage.setItem(KEY, '{nope')

    expect(freshStore().keys).toEqual([])
  })

  it('refuses a new favorite at the cap, but still removes one', () => {
    const full = Array.from({ length: MAX_FAVORITES }, (_, index) => `api:${String(index + 1)}`)
    localStorage.setItem(KEY, JSON.stringify(full))
    const favorites = freshStore()

    expect(favorites.toggle('api:5000')).toBe(false)
    expect(favorites.keys).toHaveLength(MAX_FAVORITES)
    expect(favorites.isFavorite('api:5000')).toBe(false)

    expect(favorites.toggle('api:1')).toBe(true)
    expect(favorites.keys).toHaveLength(MAX_FAVORITES - 1)
  })

  it('follows changes made in another tab, validated like a read', async () => {
    const favorites = freshStore()

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: KEY,
        newValue: JSON.stringify(['api:9', 'bogus']),
        storageArea: localStorage,
      }),
    )
    await nextTick()

    expect(favorites.keys).toEqual(['api:9'])
  })

  it('reports a failed save with a toast instead of failing silently', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 'id')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })
    const favorites = freshStore()

    favorites.toggle('api:1')
    await nextTick()

    expect(favorites.keys).toEqual(['api:1'])
    expect(toastError).toHaveBeenCalledWith("Couldn't save in this browser", {
      id: 'storage-error',
      description: 'Storage is full or blocked.',
    })
  })

  describe('when the browser blocks site data', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('reports it once and keeps favorites in memory for this visit', async () => {
      const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 'id')
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const blocked = new DOMException('The operation is insecure.', 'SecurityError')
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw blocked
      })

      const favorites = freshStore()

      expect(favorites.toggle('api:1')).toBe(true)
      expect(favorites.toggle('api:2')).toBe(true)
      expect(favorites.toggle('api:1')).toBe(true)
      await nextTick()
      expect(favorites.keys).toEqual(['api:2'])
      expect(favorites.isFavorite('api:2')).toBe(true)
      expect(consoleError).toHaveBeenCalledExactlyOnceWith('[storage]', blocked)
      expect(toastError).toHaveBeenCalledExactlyOnceWith("Couldn't save in this browser", {
        id: 'storage-error',
        description: 'Storage is full or blocked.',
      })
    })
  })
})
