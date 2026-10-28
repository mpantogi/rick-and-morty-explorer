import { render, screen } from '@testing-library/vue'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FunctionalComponent } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import BackLink from './BackLink.vue'

const Blank: FunctionalComponent = () => null
Blank.displayName = 'Blank'

function renderBackLink(back: string | null, attrs: Record<string, unknown> = {}) {
  const state = back
    ? { back, current: '/characters/1', forward: null, position: 1, replaced: false, scroll: null }
    : null
  window.history.replaceState(state, '', '/characters/1')
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/:any(.*)*', component: Blank }],
  })
  const user = userEvent.setup()
  render(BackLink, {
    props: { to: '/' },
    attrs,
    slots: { default: 'Back to characters' },
    global: { plugins: [router] },
  })
  return { router, user, link: screen.getByRole('link', { name: 'Back to characters' }) }
}

describe('BackLink', () => {
  it('returns through history to the list the visitor came from, filters included', async () => {
    const { router, user, link } = renderBackLink('/?name=rick&page=2')
    const back = vi.spyOn(router, 'back').mockImplementation(() => undefined)

    expect(link).toHaveAttribute('href', '/?name=rick&page=2')
    await user.click(link)

    expect(back).toHaveBeenCalledOnce()
  })

  it('leaves a modified click (new tab) to the browser', async () => {
    const { router, user, link } = renderBackLink('/?name=rick')
    const back = vi.spyOn(router, 'back').mockImplementation(() => undefined)
    link.addEventListener('click', (event) => {
      event.preventDefault()
    })

    await user.keyboard('{Control>}')
    await user.click(link)

    expect(back).not.toHaveBeenCalled()
  })

  it('links the fallback when the visitor did not come from the list', () => {
    const { link } = renderBackLink('/favorites')

    expect(link).toHaveAttribute('href', '/')
  })

  it('links the fallback when the visitor arrived directly', () => {
    const { link } = renderBackLink(null)

    expect(link).toHaveAttribute('href', '/')
  })

  it.each([
    ['history', '/?name=rick'],
    ['fallback', null],
  ])('puts a parent mix right after its BEM classes on the %s link', (_, back) => {
    const { link } = renderBackLink(back, { class: 'page__back' })

    expect([...link.classList].slice(0, 3)).toEqual(['link', 'back-link', 'page__back'])
  })
})
