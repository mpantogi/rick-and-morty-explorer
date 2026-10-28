<script setup lang="ts">
import { useBemMix } from '../use-bem-mix'

defineOptions({ inheritAttrs: false })

const { mix, rest } = useBemMix()
</script>

<template>
  <span
    v-bind="rest()"
    :class="['skeleton', mix(), 'block rounded-md bg-skeleton motion-safe:animate-pulse']"
    aria-hidden="true"
  />
</template>
