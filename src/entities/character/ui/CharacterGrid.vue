<script setup lang="ts">
import type { CharacterView } from '../model/types'
import CharacterCard from './CharacterCard.vue'

defineProps<{ characters: readonly CharacterView[] }>()

// About the first row at any width: load those avatars at once, and hint the first as the LCP.
const EAGER_AVATARS = 3
</script>

<template>
  <ul class="character-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    <li v-for="(character, index) in characters" :key="character.key" class="character-grid__item">
      <CharacterCard :character :eager="index < EAGER_AVATARS" :priority="index === 0" />
    </li>
  </ul>
</template>
