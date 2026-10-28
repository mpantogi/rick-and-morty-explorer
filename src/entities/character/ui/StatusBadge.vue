<script setup lang="ts">
import { BaseBadge } from '@/shared/ui'

import { statusLabel } from '../model/labels'
import type { CharacterStatus } from '../model/types'

const { status } = defineProps<{ status: CharacterStatus }>()

const TONES = {
  alive: 'success',
  dead: 'danger',
  unknown: 'neutral',
} as const satisfies Record<CharacterStatus, string>

const MODIFIERS = {
  alive: 'status-badge--alive',
  dead: 'status-badge--dead',
  unknown: 'status-badge--unknown',
} as const satisfies Record<CharacterStatus, string>
</script>

<template>
  <BaseBadge :tone="TONES[status]" dot :class="['status-badge', MODIFIERS[status]]">
    {{ statusLabel(status) }}
  </BaseBadge>
</template>
