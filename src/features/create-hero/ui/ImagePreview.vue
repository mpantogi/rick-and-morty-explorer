<script setup lang="ts">
import { ImageOff } from '@lucide/vue'
import { refDebounced } from '@vueuse/core'
import { computed, ref, toRef, watch } from 'vue'

import { heroInputSchema } from '@/entities/character'

const { url } = defineProps<{ url: string }>()

// Long enough to skip the half-typed addresses between keystrokes.
const PREVIEW_PAUSE_MS = 400

const settledUrl = refDebounced(
  toRef(() => url),
  PREVIEW_PAUSE_MS,
)
// The schema that guards the form also decides what the preview may load.
const src = computed(() => {
  const result = heroInputSchema.shape.image.safeParse(settledUrl.value)
  return result.success ? result.data : ''
})
const hasFailed = ref(false)

watch(src, () => {
  hasFailed.value = false
})
</script>

<!-- The frame keeps its size in every state, so nothing around it moves. -->
<template>
  <figure class="image-preview flex w-full max-w-72 flex-col gap-2">
    <figcaption class="image-preview__caption text-sm font-semibold">Preview</figcaption>
    <div
      class="image-preview__frame flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-surface"
    >
      <p v-if="!src" class="image-preview__empty px-6 text-center text-sm text-muted">
        Your image will appear here.
      </p>
      <span
        v-else-if="hasFailed"
        aria-hidden="true"
        class="image-preview__fallback flex size-full items-center justify-center bg-skeleton text-muted"
      >
        <ImageOff class="image-preview__fallback-icon size-12" />
      </span>
      <img
        v-else
        :src
        alt=""
        referrerpolicy="no-referrer"
        decoding="async"
        class="image-preview__image size-full object-cover"
        @error="hasFailed = true"
      />
    </div>
    <p role="status" class="image-preview__status text-sm text-muted">
      <template v-if="src && hasFailed">
        We couldn't load this image. You can still create the hero, and a placeholder will show
        instead.
      </template>
    </p>
  </figure>
</template>
