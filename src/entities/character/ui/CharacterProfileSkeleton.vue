<script setup lang="ts">
import { BaseSkeleton } from '@/shared/ui'

// The real terms keep the term column as wide as the loaded profile's.
const TERMS = ['Status', 'Species', 'Type', 'Gender', 'Origin', 'Last known location'] as const
</script>

<!-- Same box classes as CharacterProfile; the visually hidden h1 keeps the route focus target. -->
<template>
  <div
    class="character-profile-skeleton flex flex-col gap-6 md:grid md:grid-cols-[18rem_minmax(0,1fr)] md:gap-8"
  >
    <BaseSkeleton class="character-profile-skeleton__media size-72 rounded-xl" />
    <div class="character-profile-skeleton__body flex min-w-0 flex-col gap-4">
      <h1 id="page-title" tabindex="-1" class="character-profile-skeleton__title sr-only">
        Loading character…
      </h1>
      <BaseSkeleton class="character-profile-skeleton__name h-9 w-2/3 sm:h-10" />
      <BaseSkeleton class="character-profile-skeleton__actions h-11 w-32 rounded-lg" />
      <dl
        aria-hidden="true"
        class="character-profile-skeleton__facts grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2"
      >
        <template v-for="term in TERMS" :key="term">
          <dt class="character-profile-skeleton__term text-muted">{{ term }}</dt>
          <dd class="character-profile-skeleton__value flex items-center">
            <BaseSkeleton class="character-profile-skeleton__bar h-4 w-28" />
          </dd>
        </template>
      </dl>
    </div>
  </div>
</template>
