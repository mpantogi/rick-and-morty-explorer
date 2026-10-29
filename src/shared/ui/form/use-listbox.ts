import { computed, type ComputedRef, nextTick, readonly, ref, type Ref, useId } from 'vue'

export interface Listbox {
  readonly id: string
  readonly isOpen: Readonly<Ref<boolean>>
  readonly activeIndex: Readonly<Ref<number>>
  readonly activeId: ComputedRef<string | undefined>
  optionId(index: number): string
  open(activeIndex: number): void
  close(): void
  setActive(index: number): void
  move(step: 1 | -1): void
}

// Focus stays on the control; the active option is conveyed with aria-activedescendant.
export function useListbox(count: () => number): Listbox {
  const id = `${useId()}-listbox`
  const isOpen = ref(false)
  const activeIndex = ref(-1)
  const optionId = (index: number) => `${id}-option-${String(index)}`

  function setActive(index: number): void {
    activeIndex.value = Math.min(Math.max(index, 0), count() - 1)
    void nextTick(() => {
      document.getElementById(optionId(activeIndex.value))?.scrollIntoView({ block: 'nearest' })
    })
  }

  return {
    id,
    isOpen: readonly(isOpen),
    activeIndex: readonly(activeIndex),
    activeId: computed(() =>
      isOpen.value && activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined,
    ),
    optionId,
    open(index) {
      isOpen.value = true
      if (index >= 0) setActive(index)
      else activeIndex.value = -1
    },
    close() {
      isOpen.value = false
      activeIndex.value = -1
    },
    setActive,
    move(step) {
      if (activeIndex.value >= 0) setActive(activeIndex.value + step)
      else setActive(step === 1 ? 0 : count() - 1)
    },
  }
}
