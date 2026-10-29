import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed } from 'vue'

import { MAX_HEROES, STORAGE_KEYS } from '@/shared/config'
import { useStoredList } from '@/shared/lib'

import { type Hero, type HeroInput, heroSchema } from './hero-schema'
import { heroToView } from './mappers'

// Newest first. The serializer validates every read, including changes made in another tab.
export const useHeroesStore = defineStore('heroes', () => {
  const heroes = useStoredList(STORAGE_KEYS.heroes, heroSchema, MAX_HEROES)
  const views = computed(() => heroes.value.map(heroToView))

  // null when the cap refuses the hero; the caller tells the visitor why.
  function add(input: HeroInput): Hero | null {
    if (heroes.value.length >= MAX_HEROES) return null
    const hero: Hero = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    heroes.value = [hero, ...heroes.value]
    return hero
  }

  function getById(id: string): Hero | undefined {
    return heroes.value.find((hero) => hero.id === id)
  }

  return { heroes, views, add, getById }
})

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useHeroesStore, import.meta.hot))
