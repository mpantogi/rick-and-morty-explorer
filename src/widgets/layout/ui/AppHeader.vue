<script setup lang="ts">
import { Menu, X } from '@lucide/vue'
import { onClickOutside } from '@vueuse/core'
import { onUnmounted, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'

import { ThemeToggle } from '@/features/theme'
import { paths } from '@/shared/config'
import { AppLogo, BaseButton } from '@/shared/ui'

const NAV_ID = 'site-nav'
const MENU_BUTTON_ID = 'site-nav-toggle'
const NAV_LINKS = [
  { to: paths.home, label: 'Characters' },
  { to: paths.favorites, label: 'Favorites' },
  { to: paths.createHero, label: 'Create hero' },
] as const

const header = useTemplateRef<HTMLElement>('header')
// Below sm the links fold behind the menu button, so they never wrap the header onto extra rows.
const isMenuOpen = ref(false)

function closeMenu(): void {
  isMenuOpen.value = false
}

// The router keeps the scroll while the list stays on screen, so a header link goes up itself.
// A click the router did not claim (Ctrl or Cmd for a new tab) leaves this page where it is.
function scrollToTop(event: MouseEvent): void {
  if (event.defaultPrevented) window.scrollTo(0, 0)
}

// Runs after every navigation, a link to the page already open included. That link hides with
// the menu, so focus inside the menu returns to its button.
function closeAfterNavigation(): void {
  if (document.getElementById(NAV_ID)?.contains(document.activeElement)) {
    document.getElementById(MENU_BUTTON_ID)?.focus()
  }
  closeMenu()
}

onClickOutside(header, closeMenu)
onUnmounted(useRouter().afterEach(closeAfterNavigation))
</script>

<template>
  <header ref="header" class="site-header border-b border-line bg-surface">
    <div
      class="site-header__inner mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-1 gap-y-2 px-4 py-2 sm:flex sm:gap-x-4 sm:px-6 lg:px-8"
    >
      <RouterLink
        :to="paths.home"
        aria-label="Rick and Morty Explorer, home"
        aria-current="false"
        class="site-header__logo inline-flex h-11 items-center gap-2 justify-self-start rounded-lg font-bold whitespace-nowrap text-fg hover:text-accent"
        @click="scrollToTop"
      >
        <AppLogo />
        <span class="site-header__wordmark hidden md:inline">Rick and Morty Explorer</span>
      </RouterLink>
      <BaseButton
        :id="MENU_BUTTON_ID"
        variant="ghost"
        size="icon"
        aria-label="Menu"
        :aria-expanded="isMenuOpen"
        :aria-controls="NAV_ID"
        class="site-header__menu sm:hidden"
        @click="isMenuOpen = !isMenuOpen"
      >
        <X v-if="isMenuOpen" aria-hidden="true" class="site-header__menu-icon size-5" />
        <Menu v-else aria-hidden="true" class="site-header__menu-icon size-5" />
      </BaseButton>
      <nav
        :id="NAV_ID"
        aria-label="Main"
        :class="[
          'site-nav',
          isMenuOpen ? 'block' : 'hidden',
          'col-span-3 row-start-2 border-t border-line pt-2 sm:ml-auto sm:block sm:border-t-0 sm:pt-0',
        ]"
      >
        <ul class="site-nav__list flex flex-col sm:flex-row sm:gap-2">
          <li v-for="link in NAV_LINKS" :key="link.to" class="site-nav__item">
            <RouterLink
              :to="link.to"
              class="site-nav__link flex h-11 items-center rounded-lg px-2 text-sm font-semibold whitespace-nowrap text-fg decoration-2 underline-offset-8 transition-colors duration-150 hover:text-accent aria-[current=page]:underline motion-reduce:transition-none sm:px-3"
              @click="scrollToTop"
            >
              {{ link.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>
      <ThemeToggle class="site-header__toggle col-start-3 row-start-1" />
    </div>
  </header>
</template>
