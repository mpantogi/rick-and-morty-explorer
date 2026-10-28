<script setup lang="ts">
import type { CharacterView } from '../model/types'
import CharacterCard from './CharacterCard.vue'

const { characters, headingLevel = 3 } = defineProps<{
  characters: readonly CharacterView[]
  headingLevel?: 2 | 3
}>()
defineSlots<{ actions?: (props: { character: CharacterView }) => unknown }>()

// About the first row at any width: load those avatars at once, and hint the first as the LCP.
const EAGER_AVATARS = 3
</script>

<template>
  <ul class="character-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    <li v-for="(character, index) in characters" :key="character.key" class="character-grid__item">
      <CharacterCard
        :character
        :eager="index < EAGER_AVATARS"
        :priority="index === 0"
        :heading-level="headingLevel"
      >
        <template v-if="$slots.actions" #actions>
          <slot name="actions" :character />
        </template>
      </CharacterCard>
    </li>
  </ul>
</template>
