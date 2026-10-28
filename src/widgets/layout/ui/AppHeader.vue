<script setup lang="ts">
import { ThemeToggle } from '@/features/theme'
import { paths } from '@/shared/config'
import { AppLogo } from '@/shared/ui'

const NAV_LINKS = [
  { to: paths.home, label: 'Characters' },
  { to: paths.favorites, label: 'Favorites' },
  { to: paths.createHero, label: 'Create hero' },
] as const
</script>

<template>
  <header class="site-header border-b border-line bg-surface">
    <div
      class="site-header__inner mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-2 sm:flex sm:px-6 lg:px-8"
    >
      <RouterLink
        :to="paths.home"
        aria-label="Rick and Morty Explorer, home"
        aria-current="false"
        class="site-header__logo inline-flex h-11 items-center gap-2 justify-self-start rounded-lg font-bold whitespace-nowrap text-fg hover:text-accent"
      >
        <AppLogo />
        <span class="site-header__wordmark hidden sm:inline">Rick and Morty Explorer</span>
      </RouterLink>
      <nav aria-label="Main" class="site-nav col-span-2 row-start-2 sm:ml-auto">
        <ul class="site-nav__list grid grid-cols-3 gap-1 sm:flex sm:gap-2">
          <li v-for="link in NAV_LINKS" :key="link.to" class="site-nav__item">
            <RouterLink
              :to="link.to"
              class="site-nav__link flex h-11 items-center justify-center rounded-lg px-2 text-sm font-semibold whitespace-nowrap text-fg decoration-2 underline-offset-8 transition-colors duration-150 hover:text-accent aria-[current=page]:underline motion-reduce:transition-none sm:px-3"
            >
              {{ link.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>
      <ThemeToggle class="col-start-2 row-start-1 justify-self-end" />
    </div>
  </header>
</template>
