<script setup lang="ts">
import { onErrorCaptured, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { reportError } from '@/shared/lib'
import { ErrorView } from '@/shared/ui'

defineSlots<{ default: () => unknown }>()

const hasCrashed = ref(false)

onErrorCaptured((error) => {
  reportError(error, 'render')
  hasCrashed.value = true
  return false
})

// Every navigation retries, including one back to the same path (a crash on /?name=x, then Browse
// characters to /): afterEach also runs for the duplicate push a visitor makes from the error view.
onUnmounted(
  useRouter().afterEach(() => {
    hasCrashed.value = false
  }),
)
</script>

<template>
  <ErrorView v-if="hasCrashed" error-case="unknown" />
  <slot v-else />
</template>
