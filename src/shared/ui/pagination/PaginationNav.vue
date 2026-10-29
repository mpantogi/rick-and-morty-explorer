<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import BaseButton from '../button/BaseButton.vue'
import { getPageItems } from './page-items'

const { current, total, to } = defineProps<{
  current: number
  total: number
  to: (page: number) => RouteLocationRaw
}>()

const items = computed(() => getPageItems(current, total))
</script>

<!-- RouterLink compares params but not the query, so every page link would claim
     aria-current="page"; each link states its own aria-current instead. -->
<template>
  <nav
    aria-label="Pagination"
    class="pagination flex items-center justify-between gap-2 md:justify-center"
  >
    <BaseButton
      v-if="current > 1"
      :to="to(current - 1)"
      aria-current="false"
      class="pagination__step"
    >
      <ChevronLeft aria-hidden="true" class="pagination__icon size-4" />
      <span class="pagination__label sr-only sm:not-sr-only">Previous</span>
    </BaseButton>
    <span
      v-else
      aria-disabled="true"
      class="pagination__step pagination__step--disabled inline-flex h-11 items-center gap-2 rounded-lg border border-line px-4 font-semibold text-muted"
    >
      <ChevronLeft aria-hidden="true" class="pagination__icon size-4" />
      <span class="pagination__label sr-only sm:not-sr-only">Previous</span>
    </span>

    <p class="pagination__status text-sm text-muted md:hidden">Page {{ current }} of {{ total }}</p>
    <ol class="pagination__list hidden items-center gap-1 md:flex">
      <li v-for="item in items" :key="item" class="pagination__item">
        <span
          v-if="typeof item === 'string'"
          aria-hidden="true"
          class="pagination__gap inline-flex h-11 min-w-11 items-center justify-center text-muted"
        >
          …
        </span>
        <BaseButton
          v-else
          :to="to(item)"
          :variant="item === current ? 'primary' : 'secondary'"
          :aria-current="item === current ? 'page' : 'false'"
          :aria-label="`Page ${item}`"
          class="pagination__page min-w-11"
        >
          {{ item }}
        </BaseButton>
      </li>
    </ol>

    <BaseButton
      v-if="current < total"
      :to="to(current + 1)"
      aria-current="false"
      class="pagination__step"
    >
      <span class="pagination__label sr-only sm:not-sr-only">Next</span>
      <ChevronRight aria-hidden="true" class="pagination__icon size-4" />
    </BaseButton>
    <span
      v-else
      aria-disabled="true"
      class="pagination__step pagination__step--disabled inline-flex h-11 items-center gap-2 rounded-lg border border-line px-4 font-semibold text-muted"
    >
      <span class="pagination__label sr-only sm:not-sr-only">Next</span>
      <ChevronRight aria-hidden="true" class="pagination__icon size-4" />
    </span>
  </nav>
</template>
