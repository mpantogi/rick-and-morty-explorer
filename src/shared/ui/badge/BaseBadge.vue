<script setup lang="ts">
type BadgeTone = 'neutral' | 'success' | 'danger' | 'accent'

defineProps<{ tone: BadgeTone; dot?: boolean }>()
defineSlots<{ default: () => unknown }>()

const TONE_MODIFIERS = {
  neutral: 'badge--neutral',
  success: 'badge--success',
  danger: 'badge--danger',
  accent: 'badge--accent',
} as const satisfies Record<BadgeTone, string>

const TONE_UTILITIES = {
  neutral: 'bg-neutral-subtle text-fg',
  success: 'bg-success-subtle text-success',
  danger: 'bg-danger-subtle text-danger',
  accent: 'bg-accent-subtle text-accent',
} as const satisfies Record<BadgeTone, string>

const BASE_UTILITIES =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium'
</script>

<template>
  <span class="badge" :class="[TONE_MODIFIERS[tone], BASE_UTILITIES, TONE_UTILITIES[tone]]">
    <span
      v-if="dot"
      class="badge__dot size-1.5 shrink-0 rounded-full bg-current"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
