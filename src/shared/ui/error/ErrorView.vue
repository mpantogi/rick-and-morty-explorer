<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import type { ErrorCase } from '@/shared/api'
import { paths } from '@/shared/config'

import BaseButton from '../button/BaseButton.vue'
import BaseLink from '../link/BaseLink.vue'
import { ERROR_CASES } from './error-cases'

const {
  errorCase,
  description = '',
  retryable,
} = defineProps<{ errorCase: ErrorCase; description?: string; retryable?: boolean }>()
const emit = defineEmits<{ retry: [] }>()

const router = useRouter()
const copy = computed(() => ERROR_CASES[errorCase])
const canGoBack = typeof router.options.history.state.back === 'string'

function goBack(): void {
  router.back()
}

function retry(): void {
  emit('retry')
}

function reloadPage(): void {
  location.reload()
}

const recovery = computed(() => {
  if (copy.value.recovery === 'back') return canGoBack ? { label: 'Go back', run: goBack } : null
  return retryable ? { label: 'Try again', run: retry } : { label: 'Reload page', run: reloadPage }
})
</script>

<template>
  <section class="error-view flex max-w-prose flex-col gap-6" aria-labelledby="page-title">
    <h1
      id="page-title"
      tabindex="-1"
      class="error-view__title text-3xl font-bold tracking-tight text-balance sm:text-5xl"
    >
      <span class="error-view__accent text-danger">{{ copy.accent }}</span>
      {{ copy.headline }}
    </h1>
    <p class="error-view__body text-base leading-relaxed text-muted">
      {{ description || copy.body }}
    </p>
    <div class="error-view__actions flex flex-wrap gap-3">
      <BaseButton v-if="recovery" class="error-view__action" @click="recovery.run">
        {{ recovery.label }}
      </BaseButton>
      <BaseButton :to="paths.home" variant="primary" class="error-view__action">
        Browse characters
      </BaseButton>
    </div>
    <p v-if="copy.support" class="error-view__support text-sm text-muted">
      If it keeps happening, check the status of
      <BaseLink href="https://rickandmortyapi.com" class="error-view__link"
        >rickandmortyapi.com</BaseLink
      >.
    </p>
  </section>
</template>
