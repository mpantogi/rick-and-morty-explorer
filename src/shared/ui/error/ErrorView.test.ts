import { render, screen, within } from '@testing-library/vue'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FunctionalComponent } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import ErrorView from './ErrorView.vue'

const Blank: FunctionalComponent = () => null
Blank.displayName = 'Blank'

function renderErrorView(
  props: InstanceType<typeof ErrorView>['$props'],
  { back }: { back?: string } = {},
) {
  const state = back
    ? { back, current: '/nope', forward: null, position: 1, replaced: false, scroll: null }
    : null
  window.history.replaceState(state, '', '/nope')
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/:any(.*)*', component: Blank }],
  })
  const user = userEvent.setup()
  const view = render(ErrorView, { props, global: { plugins: [router] } })
  return { router, user, view }
}

function actionLabels(): string[] {
  const actions = screen.getByRole('heading', { level: 1 }).closest('section')
  return [...(actions?.querySelectorAll('.error-view__action') ?? [])].map((action) =>
    action.textContent.trim(),
  )
}

describe('ErrorView', () => {
  it('shows the not-found case with a two-tone headline and the page title id', () => {
    renderErrorView({ errorCase: 'not_found' })

    const heading = screen.getByRole('heading', {
      level: 1,
      name: "Wrong dimension. We couldn't find this page.",
    })
    expect(heading).toHaveAttribute('id', 'page-title')
    expect(within(heading).getByText('Wrong dimension.')).toHaveClass('text-danger')
    expect(
      screen.getByText("The link may be broken, or what you're looking for doesn't exist here."),
    ).toBeInTheDocument()
  })

  it('offers Go back first and Browse characters last when there is history to return to', async () => {
    const { router, user } = renderErrorView({ errorCase: 'not_found' }, { back: '/' })
    const back = vi.spyOn(router, 'back').mockImplementation(() => undefined)

    expect(actionLabels()).toEqual(['Go back', 'Browse characters'])
    expect(screen.getByRole('link', { name: 'Browse characters' })).toHaveAttribute('href', '/')

    await user.click(screen.getByRole('button', { name: 'Go back' }))
    expect(back).toHaveBeenCalledOnce()
  })

  it('omits Go back when the visitor arrived directly', () => {
    renderErrorView({ errorCase: 'not_found' })

    expect(actionLabels()).toEqual(['Browse characters'])
  })

  it('replaces the body with a specific description', () => {
    renderErrorView({ errorCase: 'not_found', description: 'No character has the ID 99999.' })

    expect(screen.getByText('No character has the ID 99999.')).toBeInTheDocument()
    expect(screen.queryByText(/The link may be broken/)).not.toBeInTheDocument()
  })

  it('offers a page reload for a server failure that cannot be retried in place', () => {
    renderErrorView({ errorCase: 'server' })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: "The portal is jammed. The character service isn't responding.",
      }),
    ).toBeInTheDocument()
    expect(actionLabels()).toEqual(['Reload page', 'Browse characters'])
  })

  it('emits retry from Try again when the caller can refetch', async () => {
    const { user, view } = renderErrorView({ errorCase: 'server', retryable: true })

    expect(actionLabels()).toEqual(['Try again', 'Browse characters'])
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(view.emitted('retry')).toHaveLength(1)
  })

  it.each(['server', 'unknown'] as const)(
    'links the API status page for the %s case',
    (errorCase) => {
      renderErrorView({ errorCase })

      expect(screen.getByRole('link', { name: 'rickandmortyapi.com' })).toHaveAttribute(
        'href',
        'https://rickandmortyapi.com',
      )
    },
  )

  it('shows the unknown case without a support line for not-found', () => {
    renderErrorView({ errorCase: 'unknown' })
    expect(
      screen.getByRole('heading', { level: 1, name: "Something broke. This page couldn't load." }),
    ).toBeInTheDocument()

    renderErrorView({ errorCase: 'not_found' })
    expect(screen.getAllByRole('link', { name: 'rickandmortyapi.com' })).toHaveLength(1)
  })
})
