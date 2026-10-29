<script setup lang="ts">
import { Heart } from '@lucide/vue'
import { computed } from 'vue'

import type { CharacterKey } from '@/entities/character'
import { showStorageLimit } from '@/shared/lib'
import { BaseButton } from '@/shared/ui'

import { useFavoritesStore } from '../model/favorites-store'

type ToggleVariant = 'icon' | 'labelled'

const {
  characterKey,
  name,
  variant = 'icon',
} = defineProps<{ characterKey: CharacterKey; name: string; variant?: ToggleVariant }>()
const emit = defineEmits<{ change: [isFavorite: boolean] }>()

const VARIANTS = {
  icon: { button: 'ghost', size: 'icon', classes: 'favorite-toggle--icon bg-surface/90' },
  labelled: { button: 'secondary', size: 'md', classes: 'favorite-toggle--labelled' },
} as const satisfies Record<ToggleVariant, object>

const favorites = useFavoritesStore()
const isFavorite = computed(() => favorites.isFavorite(characterKey))
const iconClasses = computed(() =>
  isFavorite.value ? 'favorite-toggle__icon--on size-5 fill-current text-accent' : 'size-5',
)

function toggle(): void {
  if (!favorites.toggle(characterKey)) {
    showStorageLimit()
    return
  }
  emit('change', isFavorite.value)
}
</script>

<!-- Only aria-pressed and the heart's fill and colour change, so the size never does. -->
<template>
  <BaseButton
    :variant="VARIANTS[variant].button"
    :size="VARIANTS[variant].size"
    :aria-pressed="isFavorite"
    :aria-label="variant === 'icon' ? `Favorite ${name}` : undefined"
    :class="['favorite-toggle', VARIANTS[variant].classes]"
    @click="toggle"
  >
    <Heart aria-hidden="true" :class="['favorite-toggle__icon', iconClasses]" />
    <template v-if="variant === 'labelled'">Favorite</template>
  </BaseButton>
</template>
