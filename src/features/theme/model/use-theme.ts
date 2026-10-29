import { createSharedComposable, useColorMode, useStorage } from '@vueuse/core'
import { computed } from 'vue'

import { STORAGE_KEYS } from '@/shared/config'
import { reportStorageError } from '@/shared/lib'

type ThemeMode = 'light' | 'dark'

// Writes the literal mode ('light' | 'dark'): useDark would store 'auto', which the head script ignores.
export const useTheme = createSharedComposable(() => {
  // useColorMode passes no onError to its storage, so blocked storage would log outside reportError.
  const stored = useStorage<ThemeMode>(STORAGE_KEYS.theme, 'light', undefined, {
    onError: reportStorageError,
  })
  const mode = useColorMode({ storageRef: stored })
  const isDark = computed(() => mode.value === 'dark')

  return {
    isDark,
    toggle: () => {
      mode.value = isDark.value ? 'light' : 'dark'
    },
  }
})
