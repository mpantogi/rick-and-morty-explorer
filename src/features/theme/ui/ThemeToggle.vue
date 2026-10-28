<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'

import { BaseButton } from '@/shared/ui'

import { useTheme } from '../model/use-theme'

const { isDark, toggle } = useTheme()
</script>

<template>
  <BaseButton
    variant="ghost"
    size="icon"
    :aria-pressed="isDark"
    aria-label="Dark theme"
    class="theme-toggle"
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
  </BaseButton>
</template>
