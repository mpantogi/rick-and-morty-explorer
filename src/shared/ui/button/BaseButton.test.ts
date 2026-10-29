import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'

import { paths } from '@/shared/config'

import { renderWithApp } from '../../../../test/render'
import BaseButton from './BaseButton.vue'

describe('BaseButton', () => {
  it.each([
    ['primary', 'md'],
    ['ghost', 'icon'],
  ] as const)(
    'puts the block and its %s and %s modifiers before any utility',
    async (variant, size) => {
      await renderWithApp(BaseButton, {
        props: { variant, size, 'aria-label': 'Control' },
      })

      expect([...screen.getByRole('button', { name: 'Control' }).classList].slice(0, 3)).toEqual([
        'button',
        `button--${variant}`,
        `button--${size}`,
      ])
    },
  )

  it('renders a button that never submits a form by default', async () => {
    await renderWithApp(BaseButton, { slots: { default: 'Try again' } })

    expect(screen.getByRole('button', { name: 'Try again' })).toHaveAttribute('type', 'button')
  })

  it('renders a submit button when asked to', async () => {
    await renderWithApp(BaseButton, {
      props: { type: 'submit', variant: 'primary' },
      slots: { default: 'Search' },
    })

    expect(screen.getByRole('button', { name: 'Search' })).toHaveAttribute('type', 'submit')
  })

  it('renders an in-app link for a route and navigates without a page load', async () => {
    const { router, user } = await renderWithApp(BaseButton, {
      props: { to: paths.favorites, variant: 'primary' },
      slots: { default: 'Browse favorites' },
    })
    const link = screen.getByRole('link', { name: 'Browse favorites' })

    expect(link).toHaveAttribute('href', paths.favorites)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    await user.click(link)

    await expect.poll(() => router.currentRoute.value.path).toBe(paths.favorites)
  })

  it('forwards aria attributes and listeners to the rendered control', async () => {
    const onClick = vi.fn()
    const { user } = await renderWithApp(BaseButton, {
      props: { 'aria-label': 'Dark theme', 'aria-pressed': 'true', onClick },
    })

    await user.click(screen.getByRole('button', { name: 'Dark theme', pressed: true }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('leads with the BEM block, then its variant and size modifiers', async () => {
    await renderWithApp(BaseButton, {
      props: { variant: 'ghost', size: 'icon', 'aria-label': 'Close' },
    })
    const button = screen.getByRole('button', { name: 'Close' })

    expect(button.classList[0]).toBe('button')
    expect(button).toHaveClass('button--ghost', 'button--icon')
    expect(button).not.toHaveClass('button--secondary', 'button--md')
  })

  it('defaults to the secondary, regular-size style', async () => {
    await renderWithApp(BaseButton, { slots: { default: 'Reset filters' } })

    expect(screen.getByRole('button', { name: 'Reset filters' })).toHaveClass(
      'button--secondary',
      'button--md',
    )
  })

  it("puts a parent's BEM mix right after its own BEM classes, before any utility", async () => {
    await renderWithApp(BaseButton, {
      props: { class: 'pagination__step' },
      slots: { default: 'Next' },
    })

    expect([...screen.getByRole('button', { name: 'Next' }).classList].slice(0, 4)).toEqual([
      'button',
      'button--secondary',
      'button--md',
      'pagination__step',
    ])
  })
})
