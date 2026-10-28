import type { Page } from '@playwright/test'

import type { Hero } from '../../src/entities/character/model/hero-schema.ts'
import { expect, openPage, useStoredFavorites, useStoredHeroes } from '../fixtures'
import { NO_MATCH_URL } from './api-mock'
import { PORTAL_PETE } from './heroes'

export interface AppRoute {
  name: string
  path: string
  // Responses the route causes on purpose, tolerated by the console guard.
  expectedHttpErrors: RegExp[]
  // Visible once the page has settled into the state under test.
  settled: string
  // Favorites and created heroes this browser holds when the page opens.
  favorites?: readonly string[]
  heroes?: readonly Hero[]
  // Brings the settled page into the state under test.
  prepare?: (page: Page) => Promise<void>
}

async function submitEmptyHeroForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Create hero' }).click()
  await expect(page.getByText('Enter a name.')).toBeVisible()
}

export const ROUTES: readonly AppRoute[] = [
  { name: 'home', path: '/', expectedHttpErrors: [], settled: '#results [data-state="ready"]' },
  {
    name: 'home without matches',
    path: '/?name=zzzz',
    expectedHttpErrors: [NO_MATCH_URL],
    settled: '#results [data-state="empty"]',
  },
  {
    name: 'character',
    path: '/characters/1',
    expectedHttpErrors: [],
    settled: '#episodes [data-state="ready"]',
  },
  {
    name: 'favorites without any',
    path: '/favorites',
    expectedHttpErrors: [],
    settled: '#favorites [data-state="empty"]',
  },
  {
    name: 'favorites',
    path: '/favorites',
    expectedHttpErrors: [],
    settled: '#favorites [data-state="ready"]',
    favorites: ['api:3', `hero:${PORTAL_PETE.id}`, 'api:1', 'api:2'],
    heroes: [PORTAL_PETE],
  },
  {
    name: 'create hero after a failed submit',
    path: '/heroes/new',
    expectedHttpErrors: [],
    settled: '#page-title',
    prepare: submitEmptyHeroForm,
  },
  {
    name: 'created hero',
    path: `/heroes/${PORTAL_PETE.id}`,
    expectedHttpErrors: [],
    settled: '#profile [data-state="ready"]',
    heroes: [PORTAL_PETE],
  },
  { name: 'not found', path: '/nope', expectedHttpErrors: [/\/nope$/], settled: '#page-title' },
]

// Opens a route with its stored data and waits until it shows the state under test.
export async function openRoute(page: Page, route: AppRoute): Promise<void> {
  await useStoredFavorites(page, route.favorites ?? [])
  await useStoredHeroes(page, route.heroes ?? [])
  await openPage(page, route.path)
  await expect(page.locator(route.settled)).toBeVisible()
  await route.prepare?.(page)
}
