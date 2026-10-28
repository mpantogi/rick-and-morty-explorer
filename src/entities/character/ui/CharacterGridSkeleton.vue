<script setup lang="ts">
import CharacterCardSkeleton from './CharacterCardSkeleton.vue'

defineProps<{ count: number }>()
</script>

<template>
  <ul
    aria-hidden="true"
    class="character-grid-skeleton grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
  >
    <li v-for="slot in count" :key="slot" class="character-grid-skeleton__item">
      <CharacterCardSkeleton />
    </li>
  </ul>
</template>
