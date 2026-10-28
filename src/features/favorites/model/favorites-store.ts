import { useLocalStorage } from '@vueuse/core'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed } from 'vue'

import { type CharacterKey, characterKeySchema } from '@/entities/character'
import { MAX_FAVORITES, STORAGE_KEYS } from '@/shared/config'
import { createZodSerializer, reportStorageError } from '@/shared/lib'

// Newest first. The serializer validates every read, including changes made in another tab.
export const useFavoritesStore = defineStore('favorites', () => {
  const keys = useLocalStorage<CharacterKey[]>(STORAGE_KEYS.favorites, [], {
    serializer: createZodSerializer(characterKeySchema, { max: MAX_FAVORITES }),
    writeDefaults: false,
    onError: reportStorageError,
  })
  const keySet = computed(() => new Set(keys.value))

  function isFavorite(key: CharacterKey): boolean {
    return keySet.value.has(key)
  }

  // false when an addition is refused at the cap; the caller tells the visitor why.
  function toggle(key: CharacterKey): boolean {
    if (isFavorite(key)) {
      keys.value = keys.value.filter((saved) => saved !== key)
      return true
    }
    if (keys.value.length >= MAX_FAVORITES) return false
    keys.value = [key, ...keys.value]
    return true
  }

  return { keys, isFavorite, toggle }
})

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useFavoritesStore, import.meta.hot))
