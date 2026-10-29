<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'

import {
  CharacterGrid,
  CharacterGridSkeleton,
  sameFilters,
  UI_PAGE_SIZE,
  useCharacterList,
} from '@/entities/character'
import { CharacterFiltersForm, useCharacterFilters } from '@/features/character-filters'
import { FavoriteToggle } from '@/features/favorites'
import { BaseButton, BaseSkeleton, EmptyState, PaginationNav, RegionError } from '@/shared/ui'

import { resultsSummary } from '../model/results-summary'

const emit = defineEmits<{ outOfRange: [isOutOfRange: boolean] }>()

const controller = useCharacterFilters()
const { state, retry } = useCharacterList(controller.filters, controller.page)

const heading = useTemplateRef<HTMLHeadingElement>('heading')
const filtersForm = useTemplateRef<InstanceType<typeof CharacterFiltersForm>>('filters')

// The stale page fades only once an update outlasts 300 ms, so a cached response never flickers.
const isUpdating = computed(() => state.value.kind === 'ready' && state.value.isUpdating)
const summary = computed(() => resultsSummary(state.value, controller.page.value))
const isOutOfRange = computed(
  () => state.value.kind === 'empty' && state.value.reason === 'out-of-range',
)

// The page owns the head tags; it keeps a page past the last one out of the index.
watch(isOutOfRange, (outOfRange) => {
  emit('outOfRange', outOfRange)
})

function focusHeading(): void {
  heading.value?.focus({ preventScroll: true })
}

function pagesLine(totalPages: number): string {
  return `This search has ${totalPages} ${totalPages === 1 ? 'page' : 'pages'}.`
}

// Paging swaps every card under the visitor, so focus moves to the top of the new results.
// A filter change also resets the page, but then focus must stay in the form.
watch([controller.page, controller.filters], ([page, filters], [previousPage, previousFilters]) => {
  if (page !== previousPage && sameFilters(filters, previousFilters)) void nextTick(focusHeading)
})

// Both controls below remove themselves, so focus moves somewhere meaningful first.
function resetFromEmpty(): void {
  controller.reset()
  filtersForm.value?.focusName()
}

function retryInPlace(): void {
  focusHeading()
  void retry()
}
</script>

<template>
  <section aria-labelledby="results-heading" class="character-browser flex flex-col gap-6">
    <CharacterFiltersForm ref="filters" :controller />

    <div
      class="character-browser__header flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
    >
      <h2
        id="results-heading"
        ref="heading"
        tabindex="-1"
        class="character-browser__heading text-xl font-semibold"
      >
        Results
      </h2>
      <p role="status" class="character-browser__summary min-h-5 text-sm text-muted">
        {{ summary }}
      </p>
    </div>

    <div
      id="results"
      :aria-busy="isUpdating"
      class="character-browser__results transition-opacity duration-200 aria-busy:opacity-60 aria-busy:delay-300 motion-reduce:duration-0"
    >
      <div
        v-if="state.kind === 'ready'"
        data-state="ready"
        class="character-browser__page flex flex-col gap-6"
      >
        <CharacterGrid :characters="state.page.items">
          <template #actions="{ character }">
            <FavoriteToggle :character-key="character.key" :name="character.name" />
          </template>
        </CharacterGrid>
        <PaginationNav
          v-if="state.page.totalPages > 1"
          :current="controller.page.value"
          :total="state.page.totalPages"
          :to="controller.pageLink"
        />
      </div>
      <EmptyState
        v-else-if="state.kind === 'empty' && state.reason === 'no-match'"
        data-state="empty"
        title="No characters match these filters."
        description="Try a shorter name or fewer filters."
      >
        <template #action>
          <BaseButton class="character-browser__reset" @click="resetFromEmpty">
            Reset filters
          </BaseButton>
        </template>
      </EmptyState>
      <EmptyState
        v-else-if="state.kind === 'empty'"
        data-state="empty"
        :title="`There's no page ${controller.page.value}.`"
        :description="pagesLine(state.totalPages)"
      >
        <template #action>
          <BaseButton :to="controller.pageLink(1)" class="character-browser__first-page">
            Go to the first page
          </BaseButton>
        </template>
      </EmptyState>
      <RegionError
        v-else-if="state.kind === 'error'"
        data-state="error"
        :error-case="state.errorCase"
        subject="characters"
        @retry="retryInPlace"
      />
      <div v-else data-state="loading" class="character-browser__loading flex flex-col gap-6">
        <CharacterGridSkeleton :count="UI_PAGE_SIZE" />
        <BaseSkeleton class="character-browser__pagination-skeleton h-11 w-full" />
      </div>
    </div>
  </section>
</template>
