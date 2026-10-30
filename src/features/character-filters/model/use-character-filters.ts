import { useDebounceFn } from '@vueuse/core'
import {
  computed,
  type ComputedRef,
  onMounted,
  onScopeDispose,
  reactive,
  readonly,
  type Ref,
  watch,
} from 'vue'
import { type LocationQueryRaw, type RouteLocationRaw, useRoute, useRouter } from 'vue-router'

import {
  type CharacterFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  normalizeFilters,
  sameFilters,
} from '@/entities/character'

import {
  FIRST_PAGE,
  NOT_PAGE_LINK_STATE,
  PAGE_LINK_STATE,
  parseListQuery,
  toListQuery,
} from './list-query'

export interface CharacterFiltersController {
  readonly filters: Readonly<Ref<CharacterFilters>>
  readonly page: Readonly<Ref<number>>
  readonly draft: Readonly<CharacterFilters>
  readonly activeCount: ComputedRef<number>
  update<K extends keyof CharacterFilters>(field: K, value: CharacterFilters[K]): void
  applyNow(): void
  reset(): void
  pageLink(page: number): RouteLocationRaw
}

const TEXT_INPUT_DEBOUNCE_MS = 300
// Choosing an option is one deliberate act, so it applies at once; text waits for a typing pause.
const IMMEDIATE_FIELDS: ReadonlySet<keyof CharacterFilters> = new Set(['status', 'gender'])

// The URL is the source of truth: the form edits a draft, and applying writes the URL.
export function useCharacterFilters(): CharacterFiltersController {
  const route = useRoute()
  const router = useRouter()
  const listQuery = computed(() => parseListQuery(route.query))
  const filters = computed(() => listQuery.value.filters)
  const page = computed(() => listQuery.value.page)
  const draft = reactive<CharacterFilters>({ ...filters.value })

  function replaceQuery(query: LocationQueryRaw): void {
    void router.replace({ query, state: NOT_PAGE_LINK_STATE })
  }

  // Filter changes replace history and start again from page 1; only pagination pushes.
  function apply(): void {
    replaceQuery(toListQuery(normalizeFilters(draft), FIRST_PAGE))
  }
  const applyDebounced = useDebounceFn(apply, TEXT_INPUT_DEBOUNCE_MS)
  // VueUse keeps the timer past unmount, and a late apply would write this query onto the next page.
  onScopeDispose(applyDebounced.cancel)

  function applyNow(): void {
    applyDebounced.cancel()
    apply()
  }

  // Syncs back/forward, never the echo of the draft's own trimmed apply (that would eat typed spaces).
  watch(filters, (applied) => {
    if (applyDebounced.isPending.value || sameFilters(applied, normalizeFilters(draft))) return
    Object.assign(draft, applied)
  })

  // Cleans hand-edited URLs (`page=0`, `status=al`).
  onMounted(() => {
    replaceQuery(toListQuery(filters.value, page.value))
  })

  return {
    filters,
    page,
    draft: readonly(draft),
    activeCount: computed(() => countActiveFilters(filters.value)),
    update(field, value) {
      draft[field] = value
      if (IMMEDIATE_FIELDS.has(field)) applyNow()
      else void applyDebounced()
    },
    applyNow,
    reset() {
      applyDebounced.cancel()
      Object.assign(draft, EMPTY_FILTERS)
      replaceQuery({})
    },
    pageLink: (target) => ({ query: toListQuery(filters.value, target), state: PAGE_LINK_STATE }),
  }
}
