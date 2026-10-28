import { useDebounceFn } from '@vueuse/core'
import { computed, type ComputedRef, onMounted, reactive, readonly, type Ref, watch } from 'vue'
import { type RouteLocationRaw, useRoute, useRouter } from 'vue-router'

import {
  type CharacterFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  normalizeFilters,
} from '@/entities/character'

import { parseListQuery, toListQuery } from './list-query'

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
const FIRST_PAGE = 1
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

  // Filter changes replace history and start again from page 1; only pagination pushes.
  function apply(): void {
    void router.replace({ query: toListQuery(normalizeFilters(draft), FIRST_PAGE) })
  }
  const applyDebounced = useDebounceFn(apply, TEXT_INPUT_DEBOUNCE_MS)

  function applyNow(): void {
    applyDebounced.cancel()
    apply()
  }

  watch(filters, (applied) => {
    if (!applyDebounced.isPending.value) Object.assign(draft, applied)
  })

  // Cleans hand-edited URLs (`page=0`, `status=al`); the router ignores a replace to the same URL.
  onMounted(() => {
    void router.replace({ query: toListQuery(filters.value, page.value) })
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
      void router.replace({ query: {} })
    },
    pageLink: (target) => ({ query: toListQuery(filters.value, target) }),
  }
}
