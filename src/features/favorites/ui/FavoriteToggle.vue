<script setup lang="ts">
import { Heart } from '@lucide/vue'
import { computed } from 'vue'
import { toast } from 'vue-sonner'

import type { CharacterKey } from '@/entities/character'
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
  isFavorite.value ? 'favorite-toggle__icon--on fill-current text-accent' : '',
)

function toggle(): void {
  if (!favorites.toggle(characterKey)) {
    toast.error('Limit reached', {
      id: 'favorites-limit',
      description: 'You can save up to 500 heroes and 2,000 favorites.',
    })
    return
  }
  emit('change', isFavorite.value)
}
</script>

<!-- Only aria-pressed and the fill change, so the button keeps its size in every state. -->
<template>
  <BaseButton
    :variant="VARIANTS[variant].button"
    :size="VARIANTS[variant].size"
    :aria-pressed="isFavorite"
    :aria-label="variant === 'icon' ? `Favorite ${name}` : undefined"
    class="favorite-toggle"
    :class="VARIANTS[variant].classes"
    @click="toggle"
  >
    <Heart aria-hidden="true" class="favorite-toggle__icon size-5" :class="iconClasses" />
    <template v-if="variant === 'labelled'">Favorite</template>
  </BaseButton>
</template>
