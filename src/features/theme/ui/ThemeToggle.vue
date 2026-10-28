<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'

import { useTheme } from '../model/use-theme'

const { isDark, toggle } = useTheme()
</script>

<template>
  <button
    type="button"
    :aria-pressed="isDark"
    aria-label="Dark theme"
    class="theme-toggle inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-fg transition-colors duration-150 hover:border-accent hover:text-accent motion-reduce:transition-none"
    @click="toggle"
  >
    <Moon
      aria-hidden="true"
      class="theme-toggle__icon theme-toggle__icon--moon size-5 dark:hidden"
    />
    <Sun
      aria-hidden="true"
      class="theme-toggle__icon theme-toggle__icon--sun hidden size-5 dark:block"
    />
  </button>
</template>
