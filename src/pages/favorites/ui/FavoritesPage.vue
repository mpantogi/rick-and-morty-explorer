<script setup lang="ts">
import { paths } from '@/shared/config'
import { usePageSeo } from '@/shared/lib'
import { FavoritesList } from '@/widgets/favorites-list'

usePageSeo({
  title: 'Your favorite characters',
  description:
    'Characters you saved as favorites in Rick and Morty Explorer. Stored in this browser only.',
  path: paths.favorites,
  robots: 'noindex',
})
</script>

<template>
  <div class="favorites-page flex flex-col gap-8">
    <div class="favorites-page__intro-block flex flex-col gap-4">
      <h1
        id="page-title"
        tabindex="-1"
        class="favorites-page__title text-3xl font-bold tracking-tight text-balance sm:text-4xl"
      >
        Favorites
      </h1>
      <p class="favorites-page__intro max-w-prose text-base leading-relaxed text-muted">
        Saved in this browser.
      </p>
    </div>
    <FavoritesList />
  </div>
</template>
