<script setup lang="ts">
const { title, description = '' } = defineProps<{ title: string; description?: string }>()
defineSlots<{ action?: () => unknown }>()
</script>

<template>
  <div
    class="empty-state flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6"
  >
    <p class="empty-state__title text-base font-semibold">{{ title }}</p>
    <p v-if="description" class="empty-state__description text-sm text-muted">
      {{ description }}
    </p>
    <slot name="action" />
  </div>
</template>
