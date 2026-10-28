import { screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import type { RouteLocationRaw } from 'vue-router'

import { renderWithApp } from '../../../../test/render'
import PaginationNav from './PaginationNav.vue'

// Mirrors the character browser: filters stay in the query and page 1 is the bare URL.
function to(page: number): RouteLocationRaw {
  return { query: page > 1 ? { name: 'rick', page: String(page) } : { name: 'rick' } }
}

async function renderNav(current: number, total: number) {
  await renderWithApp(PaginationNav, { route: '/?name=rick', props: { current, total, to } })
  return within(screen.getByRole('navigation', { name: 'Pagination' }))
}

describe('PaginationNav', () => {
  it('marks the current page and links its neighbours with the filters kept', async () => {
    const nav = await renderNav(35, 69)

    expect(nav.getAllByRole('link', { current: 'page' })).toEqual([
      nav.getByRole('link', { name: 'Page 35' }),
    ])
    expect(nav.getByRole('link', { name: 'Page 35' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/?name=rick&page=34',
    )
    expect(nav.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/?name=rick&page=36')
    expect(nav.getByRole('link', { name: 'Page 1' })).toHaveAttribute('href', '/?name=rick')
  })

  it('lists the first, the last and the pages around the current one', async () => {
    const nav = await renderNav(35, 69)

    expect(
      within(nav.getByRole('list'))
        .getAllByRole('link')
        .map((link) => link.textContent.trim()),
    ).toEqual(['1', '34', '35', '36', '69'])
  })

  it('hides the gaps from assistive technology', async () => {
    const nav = await renderNav(35, 69)

    const gaps = within(nav.getByRole('list')).getAllByText('…')
    expect(gaps).toHaveLength(2)
    for (const gap of gaps) expect(gap).toHaveAttribute('aria-hidden', 'true')
  })

  it('disables Previous on the first page', async () => {
    const nav = await renderNav(1, 69)

    expect(nav.queryByRole('link', { name: 'Previous' })).not.toBeInTheDocument()
    expect(nav.getByText('Previous').closest('[aria-disabled]')).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(nav.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/?name=rick&page=2')
  })

  it('disables Next on the last page', async () => {
    const nav = await renderNav(69, 69)

    expect(nav.queryByRole('link', { name: 'Next' })).not.toBeInTheDocument()
    expect(nav.getByText('Next').closest('[aria-disabled]')).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('sums up the position for the compact layout', async () => {
    const nav = await renderNav(3, 9)

    expect(nav.getByText('Page 3 of 9')).toBeInTheDocument()
  })
})
