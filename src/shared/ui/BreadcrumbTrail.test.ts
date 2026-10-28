import { screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import { renderWithApp } from '../../../test/render'
import BreadcrumbTrail from './BreadcrumbTrail.vue'

const PARENT = { label: 'Characters', to: '/' }
const ROUTE = '/characters/1'

describe('BreadcrumbTrail', () => {
  it('links the parent and marks the current page without a link', async () => {
    await renderWithApp(BreadcrumbTrail, {
      route: ROUTE,
      props: { parent: PARENT, current: 'Rick Sanchez' },
    })

    const trail = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(trail.getAllByRole('listitem')).toHaveLength(2)
    expect(trail.getByRole('link', { name: 'Characters' })).toHaveAttribute('href', '/')
    expect(trail.getByText('Rick Sanchez')).toHaveAttribute('aria-current', 'page')
    expect(trail.getAllByRole('link')).toHaveLength(1)
  })

  it('holds the place of a current page that is still loading', async () => {
    const { container } = await renderWithApp(BreadcrumbTrail, {
      route: ROUTE,
      props: { parent: PARENT },
    })

    expect(container.querySelector('[aria-current]')).not.toBeInTheDocument()
    expect(container.querySelector('.breadcrumbs__placeholder')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })
})
