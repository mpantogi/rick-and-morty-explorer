<script setup lang="ts">
import { computed } from 'vue'

import { CharacterGrid, CharacterGridSkeleton, UI_PAGE_SIZE } from '@/entities/character'
import { FavoriteToggle, useFavoriteCharacters } from '@/features/favorites'
import { paths } from '@/shared/config'
import { focusPageTitle } from '@/shared/lib'
import { BaseButton, EmptyState, RegionError } from '@/shared/ui'

// The prerendered page cannot read this browser's favorites, so it reserves a short row of cards.
const SSR_SKELETON_COUNT = 3

const { state, savedCount, retry } = useFavoriteCharacters()

const skeletonCount = computed(() =>
  import.meta.env.SSR ? SSR_SKELETON_COUNT : Math.min(savedCount.value, UI_PAGE_SIZE),
)
// The stale list fades only once an update outlasts 300 ms, so a cached response never flickers.
const isUpdating = computed(() => state.value.kind === 'ready' && state.value.isUpdating)
const count = computed(() => {
  if (state.value.kind !== 'ready') return ''
  const total = state.value.items.length
  return `${total} ${total === 1 ? 'favorite' : 'favorites'}`
})

// A removed card takes its button with it, and Try again removes itself: focus the page title.
function onFavoriteChange(isFavorite: boolean): void {
  if (!isFavorite) focusPageTitle()
}

function retryInPlace(): void {
  focusPageTitle()
  void retry()
}
</script>

<template>
  <div class="favorites-list flex flex-col gap-6">
    <p role="status" class="favorites-list__status min-h-5 text-sm text-muted">
      <span v-if="state.kind === 'loading'" class="favorites-list__loading sr-only">
        Loading favorites…
      </span>
      <template v-else>{{ count }}</template>
    </p>

    <div
      id="favorites"
      :aria-busy="isUpdating"
      class="favorites-list__results transition-opacity duration-200 aria-busy:opacity-60 aria-busy:delay-300 motion-reduce:duration-0"
    >
      <CharacterGrid
        v-if="state.kind === 'ready'"
        data-state="ready"
        :characters="state.items"
        :heading-level="2"
      >
        <template #actions="{ character }">
          <FavoriteToggle
            :character-key="character.key"
            :name="character.name"
            @change="onFavoriteChange"
          />
        </template>
      </CharacterGrid>
      <EmptyState
        v-else-if="state.kind === 'empty'"
        data-state="empty"
        title="No favorites yet."
        description="Use the heart on any character to save it here."
      >
        <template #action>
          <BaseButton :to="paths.home" variant="primary" class="favorites-list__browse">
            Browse characters
          </BaseButton>
        </template>
      </EmptyState>
      <RegionError
        v-else-if="state.kind === 'error'"
        data-state="error"
        :error-case="state.errorCase"
        subject="favorites"
        @retry="retryInPlace"
      />
      <CharacterGridSkeleton v-else data-state="loading" :count="skeletonCount" />
    </div>
  </div>
</template>
