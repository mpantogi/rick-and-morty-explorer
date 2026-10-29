import { createSharedComposable, useColorMode, useStorage } from '@vueuse/core'
import { computed, watch } from 'vue'

import { STORAGE_KEYS } from '@/shared/config'
import { reportStorageError } from '@/shared/lib'

type ThemeMode = 'light' | 'dark'

// The canvas of each theme, so the browser bar matches the page (index.html sets the first paint).
const THEME_COLORS: Readonly<Record<ThemeMode, string>> = { light: '#f9fafb', dark: '#202329' }

// Writes the literal mode ('light' | 'dark'): useDark would store 'auto', which the head script ignores.
export const useTheme = createSharedComposable(() => {
  // useColorMode passes no onError to its storage, so blocked storage would log outside reportError.
  const stored = useStorage<ThemeMode>(STORAGE_KEYS.theme, 'light', undefined, {
    onError: reportStorageError,
  })
  const mode = useColorMode({ storageRef: stored })
  const isDark = computed(() => mode.value === 'dark')
  watch(isDark, (dark) => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[dark ? 'dark' : 'light'])
  })

  return {
    isDark,
    toggle: () => {
      mode.value = isDark.value ? 'light' : 'dark'
    },
  }
})
