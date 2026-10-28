<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { reportError } from '@/shared/lib'
import { ErrorView } from '@/shared/ui'

defineSlots<{ default: () => unknown }>()

const route = useRoute()
const hasCrashed = ref(false)

onErrorCaptured((error) => {
  reportError(error, 'render')
  hasCrashed.value = true
  return false
})

watch(
  () => route.path,
  () => {
    hasCrashed.value = false
  },
)
</script>

<template>
  <ErrorView v-if="hasCrashed" error-case="unknown" />
  <slot v-else />
</template>
