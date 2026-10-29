<script setup lang="ts">
import type { EpisodeView } from '../model/types'

defineProps<{ episodes: readonly EpisodeView[] }>()
</script>

<!-- Rows keep their skeleton's height for one-line names; a long name wraps to a second line. -->
<template>
  <ol class="episode-list divide-y divide-line rounded-xl border border-line bg-surface">
    <li
      v-for="episode in episodes"
      :key="episode.id"
      class="episode-list__item flex min-h-14 flex-col justify-center px-4 py-1.5"
    >
      <p class="episode-list__name line-clamp-2 font-semibold" :title="episode.name">
        {{ episode.name }}
      </p>
      <p class="episode-list__meta text-sm text-muted">
        {{ episode.code }} ·
        <time v-if="episode.airDateIso" :datetime="episode.airDateIso" class="episode-list__date">
          {{ episode.airDate }}
        </time>
        <span v-else class="episode-list__date">{{ episode.airDate }}</span>
      </p>
    </li>
  </ol>
</template>
