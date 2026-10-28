<script setup lang="ts">
import { BaseSkeleton } from '@/shared/ui'
</script>

<!-- Same box classes as CharacterCard, so swapping skeleton for card moves nothing. -->
<template>
  <div
    class="character-card-skeleton relative flex h-36 overflow-hidden rounded-xl border border-line bg-surface sm:h-40"
  >
    <div class="character-card-skeleton__media h-full w-28 shrink-0 sm:w-36">
      <BaseSkeleton class="character-card-skeleton__avatar size-full" />
    </div>
    <div class="character-card-skeleton__body flex min-w-0 flex-1 flex-col gap-2 p-3">
      <BaseSkeleton class="character-card-skeleton__name h-5 w-3/4 sm:h-6" />
      <BaseSkeleton class="character-card-skeleton__meta h-5 w-1/2" />
      <BaseSkeleton class="character-card-skeleton__label mt-auto h-3 w-1/3" />
      <BaseSkeleton class="character-card-skeleton__location h-4 w-2/3" />
    </div>
  </div>
</template>
