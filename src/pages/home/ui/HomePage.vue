<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { countActiveFilters } from '@/entities/character'
import { parseListQuery } from '@/features/character-filters'
import { env, paths, SITE } from '@/shared/config'
import { usePageSeo } from '@/shared/lib'
import { CharacterBrowser } from '@/widgets/character-browser'

import { homeSeo } from '../model/home-seo'

const DESCRIPTION =
  'Search and filter every Rick and Morty character by name, status, species, type and gender. Save favorites and create your own hero.'

const route = useRoute()
const seo = computed(() => {
  const { filters, page } = parseListQuery(route.query)
  return homeSeo({ page, isFiltered: countActiveFilters(filters) > 0 })
})

usePageSeo({
  title: () => seo.value.title,
  description: DESCRIPTION,
  path: () => seo.value.path,
  robots: () => seo.value.robots,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${env.siteUrl}/#website`,
    url: `${env.siteUrl}${paths.home}`,
    name: SITE.name,
    description: DESCRIPTION,
    inLanguage: 'en',
  },
})
</script>

<template>
  <div class="home-page flex flex-col gap-8">
    <div class="home-page__intro-block flex flex-col gap-4">
      <h1
        id="page-title"
        tabindex="-1"
        class="home-page__title text-3xl font-bold tracking-tight text-balance sm:text-4xl"
      >
        Rick and Morty characters
      </h1>
      <p class="home-page__intro max-w-prose text-base leading-relaxed text-muted">
        Browse every character from the show using the public Rick and Morty API. Filter by name,
        status, species, type or gender, save favorites, and add a hero of your own.
      </p>
      <noscript class="home-page__noscript">
        <p class="home-page__noscript-text text-base font-semibold">
          Turn on JavaScript to search and filter characters. Character pages work without it.
        </p>
      </noscript>
    </div>
    <CharacterBrowser class="home-page__browser" />
  </div>
</template>
