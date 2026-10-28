<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

defineProps<{ to: RouteLocationRaw; href?: never } | { href: string; to?: never }>()
defineSlots<{ default: () => unknown }>()
</script>

<template>
  <RouterLink
    v-if="to"
    :to
    class="link text-accent underline underline-offset-4 hover:decoration-2"
  >
    <slot />
  </RouterLink>
  <a v-else :href class="link text-accent underline underline-offset-4 hover:decoration-2">
    <slot />
  </a>
</template>
