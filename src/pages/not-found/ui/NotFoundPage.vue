<script setup lang="ts">
import { paths } from '@/shared/config'
import { usePageSeo } from '@/shared/lib'

usePageSeo({
  title: 'Page not found',
  description: "This page doesn't exist. Browse the Rick and Morty character list instead.",
  robots: 'noindex',
})
</script>

<template>
  <section class="not-found-page flex flex-col gap-4">
    <h1
      id="page-title"
      tabindex="-1"
      class="not-found-page__title text-3xl font-bold tracking-tight text-balance sm:text-4xl"
    >
      Page not found
    </h1>
    <RouterLink :to="paths.home" class="not-found-page__link text-accent underline">
      Browse characters
    </RouterLink>
  </section>
</template>
