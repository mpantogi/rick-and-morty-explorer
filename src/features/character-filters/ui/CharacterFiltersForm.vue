<script setup lang="ts">
import { SlidersHorizontal } from '@lucide/vue'
import { computed, ref, useTemplateRef } from 'vue'

import {
  type CharacterFilters,
  countActiveFilters,
  FILTER_MAX_LENGTH,
  GENDERS,
  genderLabel,
  KNOWN_SPECIES,
  STATUSES,
  statusLabel,
} from '@/entities/character'
import { BaseButton, BaseField, BaseInput, BaseSelect } from '@/shared/ui'

import type { CharacterFiltersController } from '../model/use-character-filters'

const { controller } = defineProps<{ controller: CharacterFiltersController }>()

const PANEL_ID = 'filters-panel'
const SPECIES_LIST_ID = 'species-options'
const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  ...STATUSES.map((status) => ({ value: status, label: statusLabel(status) })),
] as const
const GENDER_OPTIONS = [
  { value: '', label: 'Any gender' },
  ...GENDERS.map((gender) => ({ value: gender, label: genderLabel(gender) })),
] as const

// Name stays outside the panel, so the toggle counts only what the panel hides.
const PANEL_FIELDS: readonly (keyof CharacterFilters)[] = ['status', 'species', 'type', 'gender']

const form = useTemplateRef<HTMLFormElement>('form')
// Below md the extra filters fold behind a toggle; from md up the panel is always shown.
const isPanelOpen = ref(false)
const panelCount = computed(() => countActiveFilters(controller.filters.value, PANEL_FIELDS))

function focusName(): void {
  const name = form.value?.elements.namedItem('name')
  if (name instanceof HTMLInputElement) name.focus()
}

// Reset removes its own button, so focus moves to the search box instead of the page body.
function resetFilters(): void {
  controller.reset()
  focusName()
}

defineExpose({ focusName })
</script>

<template>
  <form
    ref="form"
    role="search"
    aria-label="Filter characters"
    class="filters flex flex-col gap-4"
    @submit.prevent="controller.applyNow"
  >
    <div class="filters__bar flex items-end gap-3">
      <BaseField v-slot="{ id }" label="Name" class="filters__field min-w-0 flex-1">
        <BaseInput
          :id
          :model-value="controller.draft.name"
          name="name"
          type="search"
          :maxlength="FILTER_MAX_LENGTH"
          autocomplete="off"
          enterkeyhint="search"
          placeholder="e.g. Rick"
          @update:model-value="(value) => controller.update('name', value)"
        />
      </BaseField>
      <BaseButton
        class="filters__toggle md:hidden"
        :aria-expanded="isPanelOpen"
        :aria-controls="PANEL_ID"
        @click="isPanelOpen = !isPanelOpen"
      >
        <SlidersHorizontal aria-hidden="true" class="filters__toggle-icon size-4" />
        Filters
        <template v-if="panelCount > 0">
          <span class="filters__count" aria-hidden="true">({{ panelCount }})</span>
          <span class="filters__count-label sr-only">{{ panelCount }} active</span>
        </template>
      </BaseButton>
    </div>

    <div
      :id="PANEL_ID"
      :class="['filters__panel', isPanelOpen ? 'grid' : 'hidden', 'gap-4 md:grid md:grid-cols-4']"
    >
      <BaseField v-slot="{ id }" label="Status" class="filters__field">
        <BaseSelect
          :id
          :model-value="controller.draft.status"
          name="status"
          :options="STATUS_OPTIONS"
          @update:model-value="(value) => controller.update('status', value)"
        />
      </BaseField>
      <BaseField v-slot="{ id }" label="Species" class="filters__field">
        <BaseInput
          :id
          :model-value="controller.draft.species"
          name="species"
          type="text"
          :list="SPECIES_LIST_ID"
          :maxlength="FILTER_MAX_LENGTH"
          autocomplete="off"
          placeholder="e.g. Alien"
          @update:model-value="(value) => controller.update('species', value)"
        />
      </BaseField>
      <datalist :id="SPECIES_LIST_ID" class="filters__species-list">
        <option
          v-for="species in KNOWN_SPECIES"
          :key="species"
          :value="species"
          class="filters__species-option"
        />
      </datalist>
      <BaseField v-slot="{ id }" label="Type" class="filters__field">
        <BaseInput
          :id
          :model-value="controller.draft.type"
          name="type"
          type="text"
          :maxlength="FILTER_MAX_LENGTH"
          autocomplete="off"
          placeholder="e.g. Parasite"
          @update:model-value="(value) => controller.update('type', value)"
        />
      </BaseField>
      <BaseField v-slot="{ id }" label="Gender" class="filters__field">
        <BaseSelect
          :id
          :model-value="controller.draft.gender"
          name="gender"
          :options="GENDER_OPTIONS"
          @update:model-value="(value) => controller.update('gender', value)"
        />
      </BaseField>
    </div>

    <div class="filters__actions flex flex-wrap gap-3">
      <BaseButton type="submit" variant="primary" class="filters__submit">Search</BaseButton>
      <BaseButton
        v-if="controller.activeCount.value > 0"
        class="filters__reset"
        @click="resetFilters"
      >
        Reset filters
      </BaseButton>
    </div>
  </form>
</template>
