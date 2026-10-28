<script setup lang="ts">
type BadgeTone = 'neutral' | 'success' | 'danger' | 'accent'

defineProps<{ tone: BadgeTone; dot?: boolean }>()
defineSlots<{ default: () => unknown }>()

const TONE_CLASSES = {
  neutral: 'badge--neutral bg-neutral-subtle text-fg',
  success: 'badge--success bg-success-subtle text-success',
  danger: 'badge--danger bg-danger-subtle text-danger',
  accent: 'badge--accent bg-accent-subtle text-accent',
} as const satisfies Record<BadgeTone, string>
</script>

<template>
  <span
    class="badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="TONE_CLASSES[tone]"
  >
    <span
      v-if="dot"
      class="badge__dot size-1.5 shrink-0 rounded-full bg-current"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
