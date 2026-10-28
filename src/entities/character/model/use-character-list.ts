import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type ComputedRef, type Ref, watch } from 'vue'

import { type ErrorCase, toErrorCase } from '@/shared/api'
import { ignorePrefetchError } from '@/shared/lib'

import { characterQueries } from '../api/queries'
import { toApiParams } from './filters'
import { type ApiWindow, buildListPage, type ListPage } from './pagination'
import type { CharacterFilters, CharacterView } from './types'

export type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; errorCase: ErrorCase }
  | { kind: 'empty'; reason: 'no-match' | 'out-of-range'; totalPages: number }
  | { kind: 'ready'; page: ListPage; isUpdating: boolean }

export interface CharacterList {
  state: ComputedRef<ListState>
  retry: () => Promise<void>
}

const LOADING: ListState = { kind: 'loading' }
const NO_LOCAL_MATCHES: readonly CharacterView[] = []

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
  const localMatches = NO_LOCAL_MATCHES
  const params = computed(() => toApiParams(filters.value))
  const windowQuery = (uiPage: number) =>
    characterQueries.window(params.value, uiPage, localMatches.length, queryClient)

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
    return toListState(buildListPage(page.value, localMatches, data), query.isPlaceholderData.value)
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
