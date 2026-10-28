import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { computed, type ComputedRef, type Ref, watch } from 'vue'

import { type ErrorCase, toErrorCase } from '@/shared/api'
import { ignorePrefetchError } from '@/shared/lib'

import { characterQueries } from '../api/queries'
import { matchesFilters, toApiParams } from './filters'
import { useHeroesStore } from './heroes-store'
import { type ApiWindow, buildListPage, type ListPage } from './pagination'
import type { CharacterFilters } from './types'

export type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; errorCase: ErrorCase }
  | { kind: 'empty'; reason: 'no-match' | 'out-of-range'; totalPages: number }
  | { kind: 'ready'; page: ListPage; isUpdating: boolean }

interface CharacterList {
  state: ComputedRef<ListState>
  retry: () => Promise<void>
}

const LOADING: ListState = { kind: 'loading' }

// Empty is never derived from placeholder data, so stale results never flash "no match".
function toListState(listPage: ListPage, isPlaceholder: boolean): ListState {
  if (isPlaceholder) {
    return listPage.items.length > 0 ? { kind: 'ready', page: listPage, isUpdating: true } : LOADING
  }
  if (listPage.items.length > 0) return { kind: 'ready', page: listPage, isUpdating: false }
  const reason = listPage.outOfRange ? 'out-of-range' : 'no-match'
  return { kind: 'empty', reason, totalPages: listPage.totalPages }
}

export function useCharacterList(
  filters: Readonly<Ref<CharacterFilters>>,
  page: Readonly<Ref<number>>,
): CharacterList {
  const queryClient = useQueryClient()
  const { views: heroes } = storeToRefs(useHeroesStore())
  // The API cannot filter created heroes, so they are matched here by its own rules.
  const localMatches = computed(() =>
    heroes.value.filter((hero) => matchesFilters(hero, filters.value)),
  )
  const params = computed(() => toApiParams(filters.value))
  const windowQuery = (uiPage: number) =>
    characterQueries.window(params.value, uiPage, localMatches.value.length, queryClient)

  const query = useQuery(() => ({
    ...windowQuery(page.value),
    placeholderData: keepPreviousData<ApiWindow>,
    enabled: !import.meta.env.SSR,
  }))

  const state = computed<ListState>(() => {
    if (query.status.value === 'error') {
      return { kind: 'error', errorCase: toErrorCase(query.error.value) }
    }
    const data = query.data.value
    if (data === undefined) return LOADING
    return toListState(
      buildListPage(page.value, localMatches.value, data),
      query.isPlaceholderData.value,
    )
  })

  watch(state, (current) => {
    if (current.kind !== 'ready' || current.isUpdating) return
    if (page.value >= current.page.totalPages) return
    void queryClient.query(windowQuery(page.value + 1)).catch(ignorePrefetchError)
  })

  return {
    state,
    retry: async () => {
      await query.refetch()
    },
  }
}
