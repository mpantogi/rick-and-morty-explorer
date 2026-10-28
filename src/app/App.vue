<script setup lang="ts">
import { Toaster } from 'vue-sonner'

import { useTheme } from '@/features/theme'
import { AppFooter, AppHeader } from '@/widgets/layout'

import AppErrorBoundary from './ui/AppErrorBoundary.vue'

const { isDark } = useTheme()
</script>

<template>
  <div class="app flex min-h-dvh flex-col">
    <a
      href="#main"
      class="skip-link sr-only rounded-lg border border-line-strong bg-surface font-semibold text-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
    >
      Skip to main content
    </a>
    <AppHeader />
    <main
      id="main"
      tabindex="-1"
      class="app-main mx-auto w-full max-w-7xl flex-1 px-4 py-8 focus:outline-none sm:px-6 sm:py-12 lg:px-8"
    >
      <AppErrorBoundary>
        <RouterView />
      </AppErrorBoundary>
    </main>
    <AppFooter />
    <Toaster :theme="isDark ? 'dark' : 'light'" position="bottom-right" close-button />
  </div>
</template>
