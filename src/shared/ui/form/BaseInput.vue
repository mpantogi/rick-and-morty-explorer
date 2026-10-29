<script setup lang="ts">
defineProps<{ id: string }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <input
    :id
    v-model="model"
    class="input h-11 w-full rounded-lg border border-line-strong bg-field px-3 text-fg placeholder:text-muted focus-visible:-outline-offset-2"
  />
</template>
