<script setup lang="ts">
import { SlidersHorizontal } from '@lucide/vue'
import { computed, ref, useTemplateRef } from 'vue'

import {
  type CharacterFilters,
  countActiveFilters,
  FILTER_MAX_LENGTH,
  GENDERS,
  genderLabel,
  STATUSES,
  statusLabel,
} from '@/entities/character'
import { BaseButton, BaseField, BaseInput, BaseSelect } from '@/shared/ui'

import type { CharacterFiltersController } from '../model/use-character-filters'
import SpeciesCombobox from './SpeciesCombobox.vue'

const { controller } = defineProps<{ controller: CharacterFiltersController }>()
const emit = defineEmits<{ reset: [] }>()

const PANEL_ID = 'filters-panel'
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

// Reset removes its own button, so the parent moves focus once the filters clear.
function resetFilters(): void {
  controller.reset()
  emit('reset')
}

// Filters apply as they change, so there is no submit button: Enter applies typed text at once.
function submitOnEnter(event: KeyboardEvent): void {
  if (!event.isComposing && !event.defaultPrevented) form.value?.requestSubmit()
}
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
          @keydown.enter="submitOnEnter"
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
      <BaseField v-slot="{ id, labelId }" label="Status" class="filters__field">
        <BaseSelect
          :id
          :label-id
          :model-value="controller.draft.status"
          :options="STATUS_OPTIONS"
          @update:model-value="(value) => controller.update('status', value)"
        />
      </BaseField>
      <BaseField v-slot="{ id, labelId }" label="Species" class="filters__field">
        <SpeciesCombobox
          :id
          :label-id
          :model-value="controller.draft.species"
          @update:model-value="(value) => controller.update('species', value)"
          @pick="controller.applyNow"
          @keydown.enter="submitOnEnter"
        />
      </BaseField>
      <BaseField v-slot="{ id }" label="Type" class="filters__field">
        <BaseInput
          :id
          :model-value="controller.draft.type"
          name="type"
          type="text"
          :maxlength="FILTER_MAX_LENGTH"
          autocomplete="off"
          enterkeyhint="search"
          placeholder="e.g. Parasite"
          @update:model-value="(value) => controller.update('type', value)"
          @keydown.enter="submitOnEnter"
        />
      </BaseField>
      <BaseField v-slot="{ id, labelId }" label="Gender" class="filters__field">
        <BaseSelect
          :id
          :label-id
          :model-value="controller.draft.gender"
          :options="GENDER_OPTIONS"
          @update:model-value="(value) => controller.update('gender', value)"
        />
      </BaseField>
    </div>

    <div v-if="controller.activeCount.value > 0" class="filters__actions flex">
      <BaseButton class="filters__reset" @click="resetFilters">Reset filters</BaseButton>
    </div>
  </form>
</template>
