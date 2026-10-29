<script setup lang="ts" generic="T extends string">
import { Check } from '@lucide/vue'

const { activeIndex } = defineProps<{
  id: string
  labelId: string
  options: readonly { value: T; label: string }[]
  selected: string
  activeIndex: number
  optionId: (index: number) => string
}>()
const emit = defineEmits<{ pick: [index: number]; activate: [index: number] }>()

function activate(index: number): void {
  if (index !== activeIndex) emit('activate', index)
}
</script>

<!-- Options are untabbable buttons; mousedown keeps focus on the control, which owns every key. -->
<template>
  <div
    :id
    role="listbox"
    :aria-labelledby="labelId"
    class="listbox absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line-strong bg-field py-1 shadow-lg"
    @mousedown.prevent
  >
    <button
      v-for="(option, index) in options"
      :id="optionId(index)"
      :key="option.value"
      type="button"
      role="option"
      tabindex="-1"
      :aria-selected="option.value === selected"
      :class="[
        'listbox__option',
        index === activeIndex ? 'listbox__option--active' : '',
        'flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-fg',
        index === activeIndex ? 'bg-neutral-subtle outline-2 -outline-offset-2 outline-accent' : '',
      ]"
      @click="emit('pick', index)"
      @pointermove="activate(index)"
    >
      <span class="listbox__label truncate">{{ option.label }}</span>
      <Check
        v-if="option.value === selected"
        aria-hidden="true"
        class="listbox__check size-4 shrink-0 text-accent"
      />
    </button>
  </div>
</template>
