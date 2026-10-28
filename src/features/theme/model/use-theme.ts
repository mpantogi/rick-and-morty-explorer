import { createSharedComposable, useColorMode } from '@vueuse/core'
import { computed } from 'vue'

import { STORAGE_KEYS } from '@/shared/config'

// Writes the literal mode ('light' | 'dark'): useDark would store 'auto', which the head script ignores.
export const useTheme = createSharedComposable(() => {
  const mode = useColorMode({ storageKey: STORAGE_KEYS.theme, initialValue: 'light' })
  const isDark = computed({
    get: () => mode.value === 'dark',
    set: (dark: boolean) => {
      mode.value = dark ? 'dark' : 'light'
    },
  })

  return {
    isDark,
    toggle: () => {
      isDark.value = !isDark.value
    },
  }
})
