import type { RouteRecordRaw } from 'vue-router'

import { HomePage } from '@/pages/home'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomePage },
  {
    // Only canonical positive ids reach the page: `abc`, `0` and `01` fall through to not-found.
    path: '/characters/:id([1-9]\\d*)',
    name: 'character',
    component: () => import('@/pages/character').then((m) => m.CharacterPage),
    props: (route) => ({ id: Number(route.params.id) }),
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/pages/favorites').then((m) => m.FavoritesPage),
  },
  {
    path: '/heroes/new',
    name: 'hero-create',
    component: () => import('@/pages/hero-create').then((m) => m.CreateHeroPage),
  },
  {
    // Every /heroes/:id is served the one prerendered shell; the page validates the id itself.
    path: '/heroes/:id',
    name: 'hero',
    component: () => import('@/pages/hero').then((m) => m.HeroPage),
    props: true,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/not-found').then((m) => m.NotFoundPage),
  },
]
