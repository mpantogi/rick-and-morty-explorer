<script setup lang="ts">
import { displayValue, genderLabel } from '../model/labels'
import type { CharacterView } from '../model/types'
import CharacterAvatar from './CharacterAvatar.vue'
import StatusBadge from './StatusBadge.vue'

const { character } = defineProps<{ character: CharacterView }>()
defineSlots<{ actions?: () => unknown }>()
</script>

<template>
  <article
    class="character-profile flex flex-col gap-6 md:grid md:grid-cols-[18rem_minmax(0,1fr)] md:gap-8"
  >
    <div class="character-profile__media size-72 overflow-hidden rounded-xl bg-skeleton">
      <CharacterAvatar
        :src="character.image"
        :alt="character.name"
        eager
        priority
        :external="character.source === 'hero'"
      />
    </div>
    <div class="character-profile__body flex min-w-0 flex-col gap-4">
      <h1
        id="page-title"
        tabindex="-1"
        class="character-profile__name text-3xl font-bold tracking-tight text-balance sm:text-4xl"
      >
        {{ character.name }}
      </h1>
      <div v-if="$slots.actions" class="character-profile__actions flex flex-wrap gap-3">
        <slot name="actions" />
      </div>
      <dl class="character-profile__facts grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
        <dt class="character-profile__term text-muted">Status</dt>
        <dd class="character-profile__value">
          <StatusBadge :status="character.status" class="character-profile__status" />
        </dd>
        <dt class="character-profile__term text-muted">Species</dt>
        <dd class="character-profile__value">{{ displayValue(character.species) }}</dd>
        <dt class="character-profile__term text-muted">Type</dt>
        <dd class="character-profile__value">
          <template v-if="character.type">{{ character.type }}</template>
          <span v-else class="character-profile__none text-muted">None</span>
        </dd>
        <dt class="character-profile__term text-muted">Gender</dt>
        <dd class="character-profile__value">{{ genderLabel(character.gender) }}</dd>
        <dt class="character-profile__term text-muted">Origin</dt>
        <dd class="character-profile__value">{{ displayValue(character.origin) }}</dd>
        <dt class="character-profile__term text-muted">Last known location</dt>
        <dd class="character-profile__value">{{ displayValue(character.location) }}</dd>
      </dl>
    </div>
  </article>
</template>
