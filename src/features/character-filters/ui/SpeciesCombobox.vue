<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { onClickOutside } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'

import { FILTER_MAX_LENGTH, KNOWN_SPECIES } from '@/entities/character'
import { BaseButton, BaseInput, BaseListbox, useListbox } from '@/shared/ui'

const { id } = defineProps<{ id: string; labelId: string }>()
const emit = defineEmits<{ pick: [species: string] }>()
const model = defineModel<string>({ required: true })

const root = useTemplateRef<HTMLElement>('root')
// The API matches species as a substring, so this stays free text that suggests the known values.
// Typing narrows the suggestions; opening from a click, the arrow keys or the button shows them all.
const query = ref('')
const matches = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  return KNOWN_SPECIES.filter((species) => species.toLocaleLowerCase().includes(needle))
})
const items = computed(() => matches.value.map((species) => ({ value: species, label: species })))
const listbox = useListbox(() => matches.value.length)

onClickOutside(root, () => {
  listbox.close()
})

function showAll(activeIndex: number): void {
  query.value = ''
  listbox.open(activeIndex)
}

function currentIndex(): number {
  return KNOWN_SPECIES.findIndex((species) => species === model.value)
}

// A click in an open list's text moves the caret, so Enter goes back to applying the text.
function onClick(): void {
  if (listbox.isOpen.value) listbox.open(-1)
  else showAll(currentIndex())
}

function onInput(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return
  query.value = event.target.value
  if (matches.value.length > 0) listbox.open(-1)
  else listbox.close()
}

function pick(index: number): void {
  const species = matches.value[index]
  if (species === undefined) return
  model.value = species
  listbox.close()
  emit('pick', species)
}

function toggle(): void {
  document.getElementById(id)?.focus()
  if (listbox.isOpen.value) listbox.close()
  else showAll(currentIndex())
}

// A handler returns false to leave the key's default action alone.
type KeyHandler = (event: KeyboardEvent) => boolean

// Moving the caret puts focus back in the text, so Enter then applies the text, not a suggestion.
const backToText: KeyHandler = () => {
  if (listbox.activeIndex.value >= 0) listbox.open(-1)
  return false
}

// The WAI-ARIA editable combobox keys, with manual selection: Enter alone applies the typed text.
const KEYS: Readonly<Record<string, KeyHandler>> = {
  ArrowDown: (event) => {
    if (listbox.isOpen.value) listbox.move(1)
    else showAll(event.altKey ? -1 : 0)
    return true
  },
  ArrowUp: () => {
    if (listbox.isOpen.value) listbox.move(-1)
    else showAll(KNOWN_SPECIES.length - 1)
    return true
  },
  ArrowLeft: backToText,
  ArrowRight: backToText,
  Home: backToText,
  End: backToText,
  Enter: () => {
    if (listbox.activeIndex.value < 0) {
      listbox.close()
      return false
    }
    pick(listbox.activeIndex.value)
    return true
  },
  Escape: () => {
    if (!listbox.isOpen.value) return false
    listbox.close()
    return true
  },
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Tab') listbox.close()
  else if (KEYS[event.key]?.(event)) event.preventDefault()
}
</script>

<template>
  <div ref="root" class="species-combobox relative">
    <BaseInput
      :id
      v-model="model"
      class="species-combobox__input pr-11"
      name="species"
      type="text"
      role="combobox"
      :maxlength="FILTER_MAX_LENGTH"
      autocomplete="off"
      enterkeyhint="search"
      placeholder="e.g. Alien"
      aria-autocomplete="list"
      :aria-expanded="listbox.isOpen.value"
      :aria-controls="listbox.id"
      :aria-activedescendant="listbox.activeId.value"
      @click="onClick"
      @input="onInput"
      @keydown="onKeydown"
    />
    <BaseButton
      variant="ghost"
      size="icon"
      tabindex="-1"
      class="species-combobox__toggle group absolute top-0 right-0"
      :aria-labelledby="labelId"
      :aria-expanded="listbox.isOpen.value"
      :aria-controls="listbox.id"
      @mousedown.prevent
      @click="toggle"
    >
      <ChevronDown
        aria-hidden="true"
        class="species-combobox__icon size-4 text-muted transition-transform duration-150 group-aria-expanded:rotate-180 motion-reduce:transition-none"
      />
    </BaseButton>
    <BaseListbox
      :id="listbox.id"
      :hidden="!listbox.isOpen.value"
      :label-id
      :options="items"
      :selected="model"
      :active-index="listbox.activeIndex.value"
      :option-id="listbox.optionId"
      @pick="pick"
      @activate="listbox.setActive"
    />
  </div>
</template>
