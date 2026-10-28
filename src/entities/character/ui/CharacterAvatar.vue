<script setup lang="ts">
import { ImageOff } from '@lucide/vue'
import { ref } from 'vue'

const { src, alt, eager, priority } = defineProps<{
  src: string
  alt: string
  eager?: boolean
  priority?: boolean
}>()

// API avatars are 300×300; the intrinsic size lets the browser reserve the box before load.
const AVATAR_SIZE = 300
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
    class="avatar size-full object-cover"
    @error="hasFailed = true"
  />
</template>
