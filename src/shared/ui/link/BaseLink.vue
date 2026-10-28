<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import { useBemMix } from '../use-bem-mix'

defineOptions({ inheritAttrs: false })
defineProps<{ to: RouteLocationRaw; href?: never } | { href: string; to?: never }>()
defineSlots<{ default: () => unknown }>()

const { mix, rest } = useBemMix()

const UTILITIES = 'text-accent underline underline-offset-4 hover:decoration-2'
</script>

<template>
  <RouterLink v-if="to" :to v-bind="rest()" class="link" :class="[mix(), UTILITIES]">
    <slot />
  </RouterLink>
  <a v-else :href v-bind="rest()" class="link" :class="[mix(), UTILITIES]"><slot /></a>
</template>
