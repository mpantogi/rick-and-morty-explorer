<script setup lang="ts">
import { computed } from 'vue'

import {
  CharacterProfile,
  CharacterProfileSkeleton,
  heroToView,
  useHeroesStore,
} from '@/entities/character'
import { FavoriteToggle } from '@/features/favorites'
import { paths } from '@/shared/config'
import { usePageSeo } from '@/shared/lib'
import { BackLink, BreadcrumbTrail, ErrorView } from '@/shared/ui'

const { id } = defineProps<{ id: string }>()

const CHARACTERS_CRUMB = { label: 'Characters', to: paths.home }
const DESCRIPTION = 'A custom hero created in Rick and Morty Explorer. Stored in this browser only.'
const NOT_SAVED_HERE =
  "Heroes are saved in the browser where you created them. This one isn't saved here."

// The prerendered shell serves every hero, and only this browser knows them: it holds their place.
const isPrerendering = import.meta.env.SSR
const heroes = useHeroesStore()
// Stored heroes all carry a valid uuid, so any other id simply finds no hero.
const hero = computed(() => {
  const found = heroes.getById(id)
  return found ? heroToView(found) : null
})

function pageTitle(): string {
  if (hero.value) return `${hero.value.name} (your hero)`
  return isPrerendering ? 'Your hero' : 'Page not found'
}

usePageSeo({
  title: pageTitle,
  description: () => (hero.value || isPrerendering ? DESCRIPTION : NOT_SAVED_HERE),
  path: () => (hero.value ? paths.hero(id) : null),
  robots: 'noindex',
})
</script>

<template>
  <div class="hero-page flex flex-col gap-8">
    <div v-if="isPrerendering || hero" class="hero-page__trail flex flex-col gap-2">
      <BackLink :to="paths.home" class="hero-page__back">Back to characters</BackLink>
      <BreadcrumbTrail :parent="CHARACTERS_CRUMB" :current="hero?.name" />
    </div>

    <div id="profile" class="hero-page__profile">
      <CharacterProfileSkeleton v-if="isPrerendering" data-state="loading" />
      <div v-else-if="hero" data-state="ready" class="hero-page__hero flex flex-col gap-6">
        <CharacterProfile :character="hero">
          <template #actions>
            <FavoriteToggle :character-key="hero.key" :name="hero.name" variant="labelled" />
          </template>
        </CharacterProfile>
        <p class="hero-page__note text-base text-muted">
          You created this hero. It's saved in this browser.
        </p>
      </div>
      <ErrorView v-else data-state="error" error-case="not_found" :description="NOT_SAVED_HERE" />
    </div>
  </div>
</template>
