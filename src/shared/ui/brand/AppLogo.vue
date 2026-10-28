<script setup lang="ts">
import { LOGO_MARK } from './logo-mark'
</script>

<template>
  <svg
    class="app-logo size-8 shrink-0"
    :viewBox="LOGO_MARK.viewBox"
    fill="none"
    stroke="currentColor"
    :stroke-width="LOGO_MARK.strokeWidth"
    stroke-linecap="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle
      class="app-logo__ring"
      :cx="LOGO_MARK.ring.cx"
      :cy="LOGO_MARK.ring.cy"
      :r="LOGO_MARK.ring.r"
    />
    <path class="app-logo__spiral stroke-accent" :d="LOGO_MARK.spiral" />
  </svg>
</template>
