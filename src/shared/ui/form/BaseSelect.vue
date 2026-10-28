<script setup lang="ts" generic="T extends string">
defineProps<{ id: string; options: readonly { value: T; label: string }[] }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <select
    :id
    v-model="model"
    class="select h-11 w-full rounded-lg border border-line-strong bg-field px-3 text-fg"
  >
    <option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      class="select__option"
    >
      {{ option.label }}
    </option>
  </select>
</template>
