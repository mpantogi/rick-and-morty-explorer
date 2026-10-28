<script setup lang="ts">
import { displayValue } from '../model/labels'
import type { CharacterView } from '../model/types'
import CharacterAvatar from './CharacterAvatar.vue'
import StatusBadge from './StatusBadge.vue'

const {
  character,
  eager,
  priority,
  headingLevel = 3,
} = defineProps<{
  character: CharacterView
  eager?: boolean
  priority?: boolean
  // 2 where no section heading sits between the page title and the grid
  headingLevel?: 2 | 3
}>()
defineSlots<{ actions?: () => unknown }>()

const HEADING_TAGS = { 2: 'h2', 3: 'h3' } as const
</script>

<!-- Fixed heights with clamped text keep each card the size of its skeleton. The stretched link
     makes the whole card clickable; its ring sits inside, as the card clips anything outside. -->
<template>
  <article
    class="character-card relative flex h-36 overflow-hidden rounded-xl border border-line bg-surface sm:h-40"
  >
    <div class="character-card__media h-full w-28 shrink-0 sm:w-36">
      <CharacterAvatar
        :src="character.image"
        alt=""
        :eager
        :priority
        :external="character.source === 'hero'"
      />
    </div>
    <div class="character-card__body flex min-w-0 flex-1 flex-col gap-1 p-3">
      <component
        :is="HEADING_TAGS[headingLevel]"
        class="character-card__name line-clamp-2 shrink-0 text-base font-semibold sm:text-lg"
      >
        <RouterLink
          :to="character.href"
          class="character-card__link after:absolute after:inset-0 after:rounded-xl hover:text-accent focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
        >
          {{ character.name }}
        </RouterLink>
      </component>
      <p class="character-card__meta shrink-0 truncate text-sm">
        <StatusBadge :status="character.status" class="character-card__status" />
        – {{ displayValue(character.species) }}
      </p>
      <p class="character-card__location mt-auto min-w-0 shrink-0">
        <span class="character-card__location-label block text-xs text-muted">
          Last known location
        </span>
        <span class="character-card__location-name block truncate text-sm">
          {{ displayValue(character.location) }}
        </span>
      </p>
    </div>
    <!-- After the body in the DOM, so Tab reaches the name link first; it sits above the link. -->
    <div v-if="$slots.actions" class="character-card__actions absolute top-1.5 left-1.5 z-10">
      <slot name="actions" />
    </div>
  </article>
</template>
