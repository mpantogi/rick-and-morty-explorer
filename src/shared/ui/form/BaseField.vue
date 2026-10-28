<script setup lang="ts">
import { computed, useId } from 'vue'

import { useBemMix } from '../use-bem-mix'

defineOptions({ inheritAttrs: false })
const {
  label,
  hint = '',
  error = '',
} = defineProps<{
  label: string
  hint?: string
  error?: string
}>()
defineSlots<{
  default: (control: {
    id: string
    describedBy: string | undefined
    invalid: boolean
    errorId: string | undefined
  }) => unknown
}>()

const { mix, rest } = useBemMix()
const id = useId()
const hintId = `${id}-hint`
const errorId = computed(() => (error ? `${id}-error` : undefined))
const describedBy = computed(() => {
  const ids = [hint ? hintId : undefined, errorId.value].filter((value) => value !== undefined)
  return ids.length > 0 ? ids.join(' ') : undefined
})
</script>

<template>
  <div v-bind="rest()" :class="['field', mix(), 'flex flex-col gap-1.5']">
    <label :for="id" class="field__label text-sm font-semibold">{{ label }}</label>
    <slot :id :described-by="describedBy" :invalid="Boolean(error)" :error-id="errorId" />
    <p v-if="hint" :id="hintId" class="field__hint text-sm text-muted">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="field__error text-sm text-danger">{{ error }}</p>
  </div>
</template>
