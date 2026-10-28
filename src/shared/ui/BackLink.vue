<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { useRouter } from 'vue-router'

import BaseLink from './link/BaseLink.vue'
import { useBemMix } from './use-bem-mix'

defineOptions({ inheritAttrs: false })
const { to } = defineProps<{ to: string }>()
defineSlots<{ default: () => unknown }>()

const { mix, rest } = useBemMix()
const classes = () => ['back-link', mix(), 'inline-flex min-h-11 items-center gap-2 self-start']

const router = useRouter()
const { back } = router.options.history.state
const previous = typeof back === 'string' ? router.resolve(back) : null
// Coming from the list, going back restores it as left (filters, page, scroll position).
const backHref = previous?.path === to ? previous.href : ''

function goBack(event: MouseEvent): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  router.back()
}
</script>

<template>
  <BaseLink v-if="backHref" :href="backHref" v-bind="rest()" :class="classes()" @click="goBack">
    <ArrowLeft aria-hidden="true" class="back-link__icon size-4" />
    <slot />
  </BaseLink>
  <BaseLink v-else :to v-bind="rest()" :class="classes()">
    <ArrowLeft aria-hidden="true" class="back-link__icon size-4" />
    <slot />
  </BaseLink>
</template>
