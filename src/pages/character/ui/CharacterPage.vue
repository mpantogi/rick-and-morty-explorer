<script setup lang="ts">
import { computed, nextTick, toRef, useTemplateRef } from 'vue'

import { CharacterProfile, CharacterProfileSkeleton, useCharacter } from '@/entities/character'
import { EpisodeList, EpisodeListSkeleton, useEpisodes } from '@/entities/episode'
import { FavoriteToggle } from '@/features/favorites'
import { paths } from '@/shared/config'
import { usePageSeo } from '@/shared/lib'
import { BackLink, BreadcrumbTrail, ErrorView, RegionError } from '@/shared/ui'

import { characterPageSeo, episodeCount } from '../model/character-seo'

const { id } = defineProps<{ id: number }>()

const CHARACTERS_CRUMB = { label: 'Characters', to: paths.home }

const { state, retry } = useCharacter(toRef(() => id))
const character = computed(() => (state.value.kind === 'ready' ? state.value.data : null))
const episodeIds = computed(() => character.value?.episodeIds ?? [])
const episodes = useEpisodes(episodeIds)
const episodesHeading = useTemplateRef<HTMLHeadingElement>('episodesHeading')

const seo = computed(() => characterPageSeo(state.value, id))
usePageSeo({
  title: () => seo.value.title,
  description: () => seo.value.description,
  path: () => seo.value.path,
  robots: () => seo.value.robots,
  ogType: 'profile',
  image: () => seo.value.image,
  jsonLd: () => seo.value.jsonLd,
})

const appearances = computed(() => `Appears in ${episodeCount(episodeIds.value.length)}`)

function focusTitle(): void {
  document.getElementById('page-title')?.focus()
}

// Try again removes itself and each state renders its own h1, so the title takes focus while loading
// and again once settled, unless the visitor has moved focus elsewhere meanwhile.
async function retryProfile(): Promise<void> {
  const settled = retry()
  await nextTick()
  focusTitle()
  await settled
  await nextTick()
  if (document.activeElement === document.body) focusTitle()
}

function retryEpisodes(): void {
  episodesHeading.value?.focus()
  void episodes.retry()
}
</script>

<template>
  <div class="character-page flex flex-col gap-8">
    <div v-if="state.kind !== 'error'" class="character-page__trail flex flex-col gap-2">
      <BackLink :to="paths.home" class="character-page__back">Back to characters</BackLink>
      <BreadcrumbTrail :parent="CHARACTERS_CRUMB" :current="character?.name" />
    </div>

    <div id="profile" class="character-page__profile">
      <ErrorView
        v-if="state.kind === 'error'"
        data-state="error"
        :error-case="state.errorCase"
        :description="state.errorCase === 'not_found' ? `No character has the ID ${id}.` : ''"
        retryable
        @retry="retryProfile"
      />
      <CharacterProfile
        v-else-if="state.kind === 'ready'"
        data-state="ready"
        :character="state.data"
      >
        <template #actions>
          <FavoriteToggle
            :character-key="state.data.key"
            :name="state.data.name"
            variant="labelled"
          />
        </template>
      </CharacterProfile>
      <CharacterProfileSkeleton v-else data-state="loading" />
    </div>

    <section
      v-if="character"
      aria-labelledby="episodes-heading"
      class="character-page__episodes flex flex-col gap-4"
    >
      <div class="character-page__episodes-header flex flex-col gap-1">
        <h2
          id="episodes-heading"
          ref="episodesHeading"
          tabindex="-1"
          class="character-page__episodes-title text-xl font-semibold"
        >
          Episodes
        </h2>
        <p class="character-page__appearances text-sm text-muted">{{ appearances }}</p>
      </div>
      <div id="episodes" class="character-page__episode-results">
        <EpisodeList
          v-if="episodes.state.value.kind === 'ready'"
          data-state="ready"
          :episodes="episodes.state.value.data"
        />
        <RegionError
          v-else-if="episodes.state.value.kind === 'error'"
          data-state="error"
          :error-case="episodes.state.value.errorCase"
          subject="episodes"
          @retry="retryEpisodes"
        />
        <EpisodeListSkeleton v-else data-state="loading" :count="episodeIds.length" />
      </div>
    </section>
  </div>
</template>
