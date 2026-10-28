<script setup lang="ts">
import { BaseLink } from '@/shared/ui'
</script>

<template>
  <footer class="site-footer border-t border-line">
    <div class="site-footer__inner mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <p class="site-footer__text text-sm text-muted">
        Data and images from
        <BaseLink href="https://rickandmortyapi.com" class="site-footer__link"
          >The Rick and Morty API</BaseLink
        >. Unofficial fan project.
      </p>
    </div>
  </footer>
</template>
