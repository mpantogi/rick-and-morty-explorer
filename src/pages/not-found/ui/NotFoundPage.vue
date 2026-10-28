<script setup lang="ts">
import { usePageSeo } from '@/shared/lib'
import { ErrorView } from '@/shared/ui'

usePageSeo({
  title: 'Page not found',
  description: "This page doesn't exist. Browse the Rick and Morty character list instead.",
  robots: 'noindex',
})
</script>

<template>
  <ErrorView error-case="not_found" />
</template>
