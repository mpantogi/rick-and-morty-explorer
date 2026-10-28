<script setup lang="ts">
import { CreateHeroForm } from '@/features/create-hero'
import { paths } from '@/shared/config'
import { usePageSeo } from '@/shared/lib'

usePageSeo({
  title: 'Create your own hero',
  description:
    'Add your own hero to the Rick and Morty character list: pick a name, a gender and an image. Saved in this browser.',
  path: paths.createHero,
  robots: 'noindex',
})
</script>

<template>
  <div class="create-hero-page flex flex-col gap-8">
    <div class="create-hero-page__intro-block flex flex-col gap-4">
      <h1
        id="page-title"
        tabindex="-1"
        class="create-hero-page__title text-3xl font-bold tracking-tight text-balance sm:text-4xl"
      >
        Create your own hero
      </h1>
      <p class="create-hero-page__intro max-w-prose text-base leading-relaxed text-muted">
        Your hero appears first in the character list and is saved in this browser.
      </p>
    </div>
    <CreateHeroForm />
  </div>
</template>
