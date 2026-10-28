import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import { paths } from '@/shared/config'

import { renderWithApp } from '../../../../test/render'
import BaseLink from './BaseLink.vue'

describe('BaseLink', () => {
  it('renders an internal link that navigates through the router', async () => {
    const { router, user } = await renderWithApp(BaseLink, {
      props: { to: paths.favorites },
      slots: { default: 'Favorites' },
    })
    const link = screen.getByRole('link', { name: 'Favorites' })

    expect(link).toHaveAttribute('href', paths.favorites)

    await user.click(link)

    await expect.poll(() => router.currentRoute.value.path).toBe(paths.favorites)
  })

  it('renders an external link as a plain anchor', async () => {
    await renderWithApp(BaseLink, {
      props: { href: 'https://rickandmortyapi.com' },
      slots: { default: 'The Rick and Morty API' },
    })

    expect(screen.getByRole('link', { name: 'The Rick and Morty API' })).toHaveAttribute(
      'href',
      'https://rickandmortyapi.com',
    )
  })

  it('is always underlined so it never relies on colour alone', async () => {
    await renderWithApp(BaseLink, {
      props: { to: paths.createHero },
      slots: { default: 'Create hero' },
    })
    const link = screen.getByRole('link', { name: 'Create hero' })

    expect(link.classList[0]).toBe('link')
    expect(link).toHaveClass('underline')
  })

  it("puts a parent's BEM mix right after its own block, before any utility", async () => {
    await renderWithApp(BaseLink, {
      props: { href: 'https://rickandmortyapi.com', class: 'site-footer__link' },
      slots: { default: 'The Rick and Morty API' },
    })
    const link = screen.getByRole('link', { name: 'The Rick and Morty API' })

    expect([...link.classList].slice(0, 2)).toEqual(['link', 'site-footer__link'])
  })
})
