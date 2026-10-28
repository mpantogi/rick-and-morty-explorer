<script setup lang="ts">
import { BaseSkeleton } from '@/shared/ui'

defineProps<{ count: number }>()
</script>

<!-- Same box classes as EpisodeList, one row per known episode id. -->
<template>
  <ol
    aria-hidden="true"
    class="episode-list-skeleton divide-y divide-line rounded-xl border border-line bg-surface"
  >
    <li
      v-for="slot in count"
      :key="slot"
      class="episode-list-skeleton__item flex h-14 flex-col justify-center gap-1.5 px-4"
    >
      <BaseSkeleton class="episode-list-skeleton__name h-4 w-2/3" />
      <BaseSkeleton class="episode-list-skeleton__meta h-3.5 w-1/3" />
    </li>
  </ol>
</template>
