<script setup lang="ts">
import { ImageOff } from '@lucide/vue'
import { ref } from 'vue'

import { AVATAR_SIZE } from '../model/types'

const { src, alt, eager, priority, external } = defineProps<{
  src: string
  alt: string
  eager?: boolean
  priority?: boolean
  // A visitor-supplied image on someone else's host: send no referrer to it.
  external?: boolean
}>()

const hasFailed = ref(false)
</script>

<template>
  <span
    v-if="hasFailed"
    aria-hidden="true"
    class="avatar avatar--fallback flex size-full items-center justify-center bg-skeleton text-muted"
  >
    <ImageOff class="avatar__icon size-8" />
  </span>
  <img
    v-else
    :src
    :alt
    :width="AVATAR_SIZE"
    :height="AVATAR_SIZE"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="priority ? 'high' : 'auto'"
    decoding="async"
    :referrerpolicy="external ? 'no-referrer' : undefined"
    class="avatar size-full object-cover"
    @error="hasFailed = true"
  />
</template>
