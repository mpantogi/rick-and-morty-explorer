import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { computed, type ComputedRef } from 'vue'

import {
  type ApiCharacter,
  type CharacterKey,
  type CharacterView,
  characterQueries,
  findCachedCharacters,
  parseCharacterKey,
  toCharacterView,
  useHeroesStore,
} from '@/entities/character'
import { type ErrorCase, toErrorCase } from '@/shared/api'

import { useFavoritesStore } from './favorites-store'

export type ListLikeState =
  | { kind: 'loading' }
  | { kind: 'error'; errorCase: ErrorCase }
  | { kind: 'empty' }
  | { kind: 'ready'; items: CharacterView[]; isUpdating: boolean }

interface FavoriteCharacters {
  state: ComputedRef<ListLikeState>
  savedCount: ComputedRef<number>
  retry: () => Promise<void>
}

const LOADING: ListLikeState = { kind: 'loading' }
const EMPTY: ListLikeState = { kind: 'empty' }

function apiIdsOf(keys: readonly CharacterKey[]): number[] {
  const ids = keys.flatMap((key) => {
    const parsed = parseCharacterKey(key)
    return parsed.source === 'api' ? [parsed.id] : []
  })
  return ids.sort((a, b) => a - b)
}

// The API answers sorted by id; the saved order (newest first) is rebuilt here. Keys the API
// dropped, and heroes this browser does not hold, disappear from view but stay saved.
function inSavedOrder(
  keys: readonly CharacterKey[],
  characters: readonly CharacterView[],
  heroes: readonly CharacterView[],
): CharacterView[] {
  const views = new Map([...characters, ...heroes].map((view) => [view.key, view] as const))
  return keys.flatMap((key) => views.get(key) ?? [])
}

// One view per cached character, so a toggle re-renders only the card it changes.
function createViewCache(): (character: ApiCharacter) => CharacterView {
  const views = new WeakMap<ApiCharacter, CharacterView>()
  return (character) => {
    const cached = views.get(character)
    if (cached) return cached
    const view = toCharacterView(character)
    views.set(character, view)
    return view
  }
}

// Placeholder data still holds a removed favorite; filtering by the current keys hides it at once.
function toListLikeState(items: CharacterView[], isPlaceholder: boolean): ListLikeState {
  if (items.length > 0) return { kind: 'ready', items, isUpdating: isPlaceholder }
  return isPlaceholder ? LOADING : EMPTY
}

export function useFavoriteCharacters(): FavoriteCharacters {
  const queryClient = useQueryClient()
  const { keys } = storeToRefs(useFavoritesStore())
  const { views: heroes } = storeToRefs(useHeroesStore())
  const apiIds = computed(() => apiIdsOf(keys.value))
  const viewOf = createViewCache()
  // Characters already cached (a removal, or favorites saved from the list) need no request.
  const query = useQuery(() => ({
    ...characterQueries.byIds(apiIds.value),
    initialData: () => findCachedCharacters(queryClient, apiIds.value),
    placeholderData: keepPreviousData<ApiCharacter[]>,
    enabled: apiIds.value.length > 0 && !import.meta.env.SSR,
  }))

  const state = computed<ListLikeState>(() => {
    if (import.meta.env.SSR) return LOADING
    // Created heroes live in this browser, so a list of heroes alone needs no request.
    if (apiIds.value.length === 0)
      return toListLikeState(inSavedOrder(keys.value, [], heroes.value), false)
    if (query.status.value === 'error') {
      return { kind: 'error', errorCase: toErrorCase(query.error.value) }
    }
    const data = query.data.value
    if (data === undefined) return LOADING
    return toListLikeState(
      inSavedOrder(keys.value, data.map(viewOf), heroes.value),
      query.isPlaceholderData.value,
    )
  })

  return {
    state,
    savedCount: computed(() => keys.value.length),
    retry: async () => {
      await query.refetch()
    },
  }
}
