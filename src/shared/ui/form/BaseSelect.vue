<script setup lang="ts" generic="T extends string">
import { ChevronDown } from '@lucide/vue'
import { onClickOutside } from '@vueuse/core'
import { computed, useTemplateRef } from 'vue'

import { useBemMix } from '../use-bem-mix'
import BaseListbox from './BaseListbox.vue'
import { useListbox } from './use-listbox'

defineOptions({ inheritAttrs: false })
const { options } = defineProps<{
  id: string
  labelId: string
  options: readonly { value: T; label: string }[]
}>()
const model = defineModel<T>({ required: true })

// A pause this long starts a new type-ahead search, as in a native select.
const TYPEAHEAD_RESET_MS = 500

const { mix, rest } = useBemMix()
const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const listbox = useListbox(() => options.length)
const selectedIndex = computed(() => options.findIndex((option) => option.value === model.value))
const selectedLabel = computed(() => options[selectedIndex.value]?.label ?? '')

let typed = ''
let typedAt = 0

onClickOutside(root, () => {
  listbox.close()
})

function openAtSelected(): void {
  listbox.open(Math.max(selectedIndex.value, 0))
}

function commit(index: number): void {
  const option = options[index]
  if (option) model.value = option.value
  listbox.close()
}

// Safari and Firefox on macOS leave a clicked button unfocused, and every key is handled on it.
function toggle(): void {
  trigger.value?.focus()
  if (listbox.isOpen.value) listbox.close()
  else openAtSelected()
}

function typeahead(key: string): void {
  const now = Date.now()
  typed = now - typedAt > TYPEAHEAD_RESET_MS ? key : `${typed}${key}`
  typedAt = now
  const prefix = typed.toLocaleLowerCase()
  const match = options.findIndex((option) => option.label.toLocaleLowerCase().startsWith(prefix))
  if (!listbox.isOpen.value) openAtSelected()
  if (match >= 0) listbox.setActive(match)
}

const commitActive = () => {
  commit(listbox.activeIndex.value)
}

type KeyHandler = (event: KeyboardEvent) => void

// The WAI-ARIA select-only combobox keys; printable keys go to type-ahead, the rest keep their default.
const CLOSED_KEYS: Readonly<Record<string, KeyHandler>> = {
  ArrowDown: openAtSelected,
  ArrowUp: openAtSelected,
  Enter: openAtSelected,
  ' ': openAtSelected,
  Home: () => {
    listbox.open(0)
  },
  End: () => {
    listbox.open(options.length - 1)
  },
}

const OPEN_KEYS: Readonly<Record<string, KeyHandler>> = {
  ArrowDown: () => {
    listbox.move(1)
  },
  ArrowUp: (event) => {
    if (event.altKey) commitActive()
    else listbox.move(-1)
  },
  Home: () => {
    listbox.setActive(0)
  },
  End: () => {
    listbox.setActive(options.length - 1)
  },
  Enter: commitActive,
  ' ': commitActive,
  Escape: () => {
    listbox.close()
  },
}

function isTypeahead(event: KeyboardEvent): boolean {
  return event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Tab') {
    if (listbox.isOpen.value) commitActive()
    return
  }
  const handler = (listbox.isOpen.value ? OPEN_KEYS : CLOSED_KEYS)[event.key]
  if (handler) {
    event.preventDefault()
    handler(event)
  } else if (isTypeahead(event)) {
    event.preventDefault()
    typeahead(event.key)
  }
}
</script>

<template>
  <div ref="root" :class="['select', mix(), 'relative']">
    <!-- Space acts on keydown, so its keyup must not also click the button. -->
    <button
      :id
      ref="trigger"
      v-bind="rest()"
      type="button"
      role="combobox"
      :aria-expanded="listbox.isOpen.value"
      :aria-controls="listbox.id"
      :aria-activedescendant="listbox.activeId.value"
      class="select__trigger group flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-line-strong bg-field px-3 text-left text-fg focus-visible:-outline-offset-2"
      @click="toggle"
      @keydown="onKeydown"
      @keyup.space.prevent
    >
      <span class="select__value truncate">{{ selectedLabel }}</span>
      <ChevronDown
        aria-hidden="true"
        class="select__icon size-4 shrink-0 text-muted transition-transform duration-150 group-aria-expanded:rotate-180 motion-reduce:transition-none"
      />
    </button>
    <BaseListbox
      :id="listbox.id"
      :hidden="!listbox.isOpen.value"
      :label-id
      :options
      :selected="model"
      :active-index="listbox.activeIndex.value"
      :option-id="listbox.optionId"
      @pick="commit"
      @activate="listbox.setActive"
    />
  </div>
</template>
