<script setup lang="ts">
import { computed } from 'vue'

import type { ErrorCase } from '@/shared/api'

import { buttonClasses } from '../button/button-classes'

const { errorCase, subject } = defineProps<{ errorCase: ErrorCase; subject: string }>()
const emit = defineEmits<{ retry: [] }>()

const reason = computed(() =>
  errorCase === 'server'
    ? "The Rick and Morty API isn't responding right now."
    : 'Check your connection and try again.',
)
</script>

<template>
  <div
    class="region-error flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6"
  >
    <p class="region-error__title text-base font-semibold">Couldn't load {{ subject }}.</p>
    <p class="region-error__reason text-sm text-muted">{{ reason }}</p>
    <button
      type="button"
      :class="['region-error__retry', buttonClasses('secondary')]"
      @click="emit('retry')"
    >
      Try again
    </button>
  </div>
</template>
