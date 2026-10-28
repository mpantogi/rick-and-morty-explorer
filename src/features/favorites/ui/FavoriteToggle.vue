<script setup lang="ts">
import { Heart } from '@lucide/vue'
import { computed } from 'vue'
import { toast } from 'vue-sonner'

import type { CharacterKey } from '@/entities/character'
import { BaseButton } from '@/shared/ui'

import { useFavoritesStore } from '../model/favorites-store'

const {
  characterKey,
  name,
  variant = 'icon',
} = defineProps<{ characterKey: CharacterKey; name: string; variant?: 'icon' | 'labelled' }>()
const emit = defineEmits<{ change: [isFavorite: boolean] }>()

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
    v-if="variant === 'icon'"
    variant="ghost"
    size="icon"
    :aria-pressed="isFavorite"
    :aria-label="`Favorite ${name}`"
    class="favorite-toggle favorite-toggle--icon bg-surface/90"
    @click="toggle"
  >
    <Heart aria-hidden="true" class="favorite-toggle__icon size-5" :class="iconClasses" />
  </BaseButton>
  <BaseButton
    v-else
    :aria-pressed="isFavorite"
    class="favorite-toggle favorite-toggle--labelled"
    @click="toggle"
  >
    <Heart aria-hidden="true" class="favorite-toggle__icon size-5" :class="iconClasses" />
    Favorite
  </BaseButton>
</template>
