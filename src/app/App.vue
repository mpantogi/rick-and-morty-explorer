<script setup lang="ts">
import { Toaster } from 'vue-sonner'

import { useTheme } from '@/features/theme'

import AppErrorBoundary from './ui/AppErrorBoundary.vue'

const { isDark } = useTheme()
</script>

<template>
  <main
    id="main"
    tabindex="-1"
    class="app-main mx-auto w-full max-w-7xl px-4 py-8 focus:outline-none sm:px-6 sm:py-12 lg:px-8"
  >
    <AppErrorBoundary>
      <RouterView />
    </AppErrorBoundary>
  </main>
  <Toaster :theme="isDark ? 'dark' : 'light'" position="bottom-right" close-button />
</template>
