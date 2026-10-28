<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import type { RouteLocationRaw } from 'vue-router'

import BaseLink from './link/BaseLink.vue'
import BaseSkeleton from './skeleton/BaseSkeleton.vue'

const { parent, current = '' } = defineProps<{
  parent: { label: string; to: RouteLocationRaw }
  current?: string
}>()
</script>

<!-- Without a current label (still loading) the last crumb holds its place with a skeleton. -->
<template>
  <nav aria-label="Breadcrumb" class="breadcrumbs min-w-0">
    <ol class="breadcrumbs__list flex min-w-0 items-center gap-2 text-sm">
      <li class="breadcrumbs__item flex shrink-0 items-center gap-2">
        <BaseLink :to="parent.to" class="breadcrumbs__link inline-flex min-h-6 items-center">
          {{ parent.label }}
        </BaseLink>
        <ChevronRight aria-hidden="true" class="breadcrumbs__separator size-4 text-muted" />
      </li>
      <li class="breadcrumbs__item breadcrumbs__item--current min-w-0">
        <span v-if="current" aria-current="page" class="breadcrumbs__current block truncate">
          {{ current }}
        </span>
        <BaseSkeleton v-else class="breadcrumbs__placeholder h-4 w-32" />
      </li>
    </ol>
  </nav>
</template>
