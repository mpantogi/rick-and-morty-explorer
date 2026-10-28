<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'md' | 'icon'

const {
  variant = 'secondary',
  size = 'md',
  to = '',
  href = '',
  type = 'button',
} = defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  to?: RouteLocationRaw
  href?: string
  type?: 'button' | 'submit'
}>()
defineSlots<{ default?: () => unknown }>()

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none'

const VARIANT_CLASSES = {
  primary: 'button--primary bg-accent text-accent-fg hover:bg-accent/90',
  secondary: 'button--secondary border border-line-strong bg-surface text-fg hover:border-accent',
  ghost: 'button--ghost text-fg hover:text-accent',
} as const satisfies Record<ButtonVariant, string>

const SIZE_CLASSES = {
  md: 'button--md h-11 rounded-lg px-4',
  icon: 'button--icon size-11 shrink-0 rounded-full',
} as const satisfies Record<ButtonSize, string>

const classes = computed(() => [VARIANT_CLASSES[variant], SIZE_CLASSES[size], BASE_CLASSES])
</script>

<template>
  <RouterLink v-if="to" :to class="button" :class="classes"><slot /></RouterLink>
  <a v-else-if="href" :href class="button" :class="classes"><slot /></a>
  <button v-else :type class="button" :class="classes"><slot /></button>
</template>
