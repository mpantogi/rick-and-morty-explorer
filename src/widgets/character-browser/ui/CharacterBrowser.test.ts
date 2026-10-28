import { screen, within } from '@testing-library/vue'
import { http } from 'msw/http'
import { describe, expect, it, vi } from 'vitest'

import { API, apiJson } from '../../../../test/msw/handlers'
import { server } from '../../../../test/msw/server'
import { renderWithApp } from '../../../../test/render'
import CharacterBrowser from './CharacterBrowser.vue'

// Samples every DOM change: the region must never hold two state branches at once.
function trackStates(root: Element) {
  const seen: string[] = []
  let maxAtOnce = 0
  const record = () => {
    const branches = [...root.querySelectorAll<HTMLElement>('#results [data-state]')]
    maxAtOnce = Math.max(maxAtOnce, branches.length)
    const current = branches.map((branch) => branch.dataset.state).join('+')
    if (current && seen.at(-1) !== current) seen.push(current)
  }
  const observer = new MutationObserver(record)
  observer.observe(root, { subtree: true, childList: true, attributes: true })
  record()
  return {
    seen,
    maxAtOnce: () => maxAtOnce,
    stop: () => {
      observer.disconnect()
    },
  }
}

function holdListResponses(): () => void {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.get(`${API}/character`, async () => {
      await gate
    }),
  )
  return release
}

async function setup(route = '/') {
  const rendered = await renderWithApp(CharacterBrowser, { route })
  const results = () =>
    within(rendered.container.querySelector<HTMLElement>('#results') ?? document.body)
  const summary = () => screen.getByRole('status')
  return { ...rendered, results, summary }
}

describe('CharacterBrowser', () => {
  it('shows the skeleton, then the first 12 characters, never both at once', async () => {
    const rendered = await renderWithApp(CharacterBrowser, { route: '/' })
    const states = trackStates(rendered.container)

    expect(screen.getByRole('status')).toHaveTextContent('Loading characters…')
    await vi.waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(12)
    })
    states.stop()

    expect(states.seen).toEqual(['loading', 'ready'])
    expect(states.maxAtOnce()).toBe(1)
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–12 of 25 characters')
  })

  it('links the next page and focuses the results heading after paging', async () => {
    const { user, router, summary } = await setup()
    await vi.waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(12)
    })

    await user.click(screen.getByRole('link', { name: 'Next' }))

    await vi.waitFor(() => {
      expect(summary()).toHaveTextContent('Showing 13–24 of 25 characters')
    })
    expect(router.currentRoute.value.fullPath).toBe('/?page=2')
    expect(screen.getByRole('heading', { level: 2, name: 'Results' })).toHaveFocus()
  })

  it('leaves focus in the search box while the filters change the page', async () => {
    const { user, summary } = await setup('/?page=2')
    await vi.waitFor(() => {
      expect(summary()).toHaveTextContent('Showing 13–24 of 25 characters')
    })
    const search = screen.getByRole('searchbox', { name: 'Name' })

    await user.type(search, 'morty{Enter}')

    await vi.waitFor(() => {
      expect(summary()).toHaveTextContent('Showing 1–4 of 4 characters')
    })
    expect(search).toHaveFocus()
  })

  it('summarises a single match in the singular', async () => {
    const { summary } = await setup('/?name=abradolf')

    await vi.waitFor(() => {
      expect(summary()).toHaveTextContent('Showing 1 of 1 character')
    })
  })

  it('offers a reset when nothing matches, and returns focus to the search box', async () => {
    const { user, results, summary, router } = await setup('/?name=zzzz')
    await vi.waitFor(() => {
      expect(results().getByText('No characters match these filters.')).toBeInTheDocument()
    })
    expect(summary()).toHaveTextContent('No characters match these filters')
    expect(results().getByText('Try a shorter name or fewer filters.')).toBeInTheDocument()

    await user.click(results().getByRole('button', { name: 'Reset filters' }))

    await vi.waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(12)
    })
    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveFocus()
  })

  it('explains a page past the last one and links back to the first', async () => {
    const { results, summary } = await setup('/?name=morty&page=4')

    await vi.waitFor(() => {
      expect(results().getByText("There's no page 4.")).toBeInTheDocument()
    })
    expect(summary()).toHaveTextContent("There's no page 4.")
    expect(results().getByText('This search has 1 page.')).toBeInTheDocument()
    expect(results().getByRole('link', { name: 'Go to the first page' })).toHaveAttribute(
      'href',
      '/?name=morty',
    )
  })

  it('tells its page when the requested page turns out to be past the last one', async () => {
    const rendered = await setup('/?name=morty&page=4')
    await vi.waitFor(() => {
      expect(rendered.emitted('outOfRange')).toEqual([[true]])
    })

    await rendered.router.push('/?name=morty')

    await vi.waitFor(() => {
      expect(rendered.results().getAllByRole('article')).toHaveLength(4)
    })
    expect(rendered.emitted('outOfRange')).toEqual([[true], [false]])
  })

  it('never reports an existing page as out of range', async () => {
    const rendered = await setup()

    await vi.waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(12)
    })
    expect(rendered.emitted('outOfRange')).toBeUndefined()
  })

  it('shows the failure in place, without a skeleton, and retries from the heading', async () => {
    server.use(http.get(`${API}/character`, () => apiJson({ error: 'boom' }, 500), { once: true }))
    const { user, results, summary, container } = await setup()

    await vi.waitFor(() => {
      expect(results().getByText("Couldn't load characters.")).toBeInTheDocument()
    })
    expect(summary()).toHaveTextContent("Characters couldn't load")
    expect(container.querySelector('[data-state="loading"]')).not.toBeInTheDocument()

    await user.click(results().getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Results' })).toHaveFocus()
    await vi.waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(12)
    })
  })

  it('keeps the cards readable and marks the region busy while a new search loads', async () => {
    const { router, summary, container } = await setup()
    await vi.waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(12)
    })
    const region = container.querySelector('#results')
    const release = holdListResponses()

    await router.replace('/?name=morty')

    await vi.waitFor(() => {
      expect(region).toHaveAttribute('aria-busy', 'true')
    })
    expect(summary()).toHaveTextContent('Updating results…')
    expect(screen.getByRole('heading', { level: 3, name: 'Rick Sanchez' })).toBeInTheDocument()
    expect(container.querySelector('.character-browser__progress')).toHaveAttribute(
      'aria-hidden',
      'true',
    )

    release()

    await vi.waitFor(() => {
      expect(region).toHaveAttribute('aria-busy', 'false')
    })
    expect(container.querySelector('.character-browser__progress')).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(4)
  })
})
