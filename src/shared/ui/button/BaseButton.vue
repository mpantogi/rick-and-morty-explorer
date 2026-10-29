<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import { useBemMix } from '../use-bem-mix'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'md' | 'icon'

defineOptions({ inheritAttrs: false })
const {
  variant = 'secondary',
  size = 'md',
  to = '',
  type = 'button',
} = defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  to?: RouteLocationRaw
  type?: 'button' | 'submit'
}>()
defineSlots<{ default?: () => unknown }>()

const { mix, rest } = useBemMix()

const BASE_UTILITIES =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none'

const VARIANT_MODIFIERS = {
  primary: 'button--primary',
  secondary: 'button--secondary',
  ghost: 'button--ghost',
} as const satisfies Record<ButtonVariant, string>

const SIZE_MODIFIERS = {
  md: 'button--md',
  icon: 'button--icon',
} as const satisfies Record<ButtonSize, string>

const VARIANT_UTILITIES = {
  primary: 'bg-accent text-accent-fg hover:bg-accent/90',
  secondary: 'border border-line-strong bg-surface text-fg hover:border-accent',
  ghost: 'text-fg hover:text-accent',
} as const satisfies Record<ButtonVariant, string>

const SIZE_UTILITIES = {
  md: 'h-11 rounded-lg px-4',
  icon: 'size-11 shrink-0 rounded-full',
} as const satisfies Record<ButtonSize, string>

// BEM block, modifiers and the parent's mix first, utilities after (the project's class order).
const classes = () => [
  'button',
  VARIANT_MODIFIERS[variant],
  SIZE_MODIFIERS[size],
  mix(),
  VARIANT_UTILITIES[variant],
  SIZE_UTILITIES[size],
  BASE_UTILITIES,
]
</script>

<template>
  <RouterLink v-if="to" :to v-bind="rest()" :class="classes()"><slot /></RouterLink>
  <button v-else :type v-bind="rest()" :class="classes()"><slot /></button>
</template>
