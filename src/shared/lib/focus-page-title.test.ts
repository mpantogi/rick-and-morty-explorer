import { afterEach, describe, expect, it, vi } from 'vitest'

import { focusPageTitle } from './focus-page-title'

describe('focusPageTitle', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('focuses the page title without scrolling the visitor away from where they were', () => {
    const title = document.createElement('h1')
    title.id = 'page-title'
    title.tabIndex = -1
    document.body.append(title)
    const focus = vi.spyOn(title, 'focus')

    focusPageTitle()

    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
    expect(title).toHaveFocus()
  })

  it('does nothing on a page that has no title yet', () => {
    expect(() => {
      focusPageTitle()
    }).not.toThrow()
  })
})
