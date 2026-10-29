<script setup lang="ts">
import { useBemMix } from '../use-bem-mix'

defineOptions({ inheritAttrs: false })
defineProps<{ id: string }>()
const model = defineModel<string>({ required: true })

const { mix, rest } = useBemMix()
</script>

<template>
  <input
    :id
    v-model="model"
    v-bind="rest()"
    :class="[
      'input',
      mix(),
      'h-11 w-full rounded-lg border border-line-strong bg-field px-3 text-fg placeholder:text-muted focus-visible:-outline-offset-2 aria-invalid:border-danger',
    ]"
  />
</template>
