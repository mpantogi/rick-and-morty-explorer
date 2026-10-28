import { screen, within } from '@testing-library/vue'
import { http } from 'msw/http'
import { describe, expect, it, vi } from 'vitest'

import { characterQueries } from '@/entities/character'
import { episodeQueries } from '@/entities/episode'

import { CHARACTERS } from '../../../../test/fixtures/characters'
import { EPISODES } from '../../../../test/fixtures/episodes'
import { API, apiJson } from '../../../../test/msw/handlers'
import { server } from '../../../../test/msw/server'
import { createTestQueryClient, renderWithApp } from '../../../../test/render'
import CharacterPage from './CharacterPage.vue'

// Aqua Rick appears in episodes 10, 22 and 28, all three in the episode fixture.
const AQUA_RICK = 22

function trackApiRequests(): string[] {
  const paths: string[] = []
  server.use(
    http.get(`${API}/*`, ({ request }) => {
      paths.push(decodeURIComponent(new URL(request.url).pathname))
    }),
  )
  return paths
}

function character(id: number) {
  const found = CHARACTERS.find((record) => record.id === id)
  if (!found) throw new Error(`No fixture character ${String(id)}`)
  return found
}

function seed(id: number, parts: { detail: boolean; episodes: boolean }) {
  const queryClient = createTestQueryClient()
  const record = character(id)
  if (parts.detail) queryClient.setQueryData(characterQueries.detail(id).queryKey, record)
  if (parts.episodes) {
    const ids = record.episode.map((url) => Number(url.split('/').at(-1)))
    queryClient.setQueryData(
      episodeQueries.byIds(ids).queryKey,
      EPISODES.filter((episode) => ids.includes(episode.id)),
    )
  }
  return queryClient
}

function seededClient(id: number) {
  return seed(id, { detail: true, episodes: true })
}

async function renderPage(id: number, queryClient = createTestQueryClient()) {
  const rendered = await renderWithApp(CharacterPage, {
    route: `/characters/${String(id)}`,
    props: { id },
    queryClient,
  })
  const region = (selector: string) =>
    within(rendered.container.querySelector<HTMLElement>(selector) ?? document.body)
  return { ...rendered, region }
}

function episodeNames(container: Element): string[] {
  return [...container.querySelectorAll('#episodes li')].map(
    (item) => item.querySelector('p')?.textContent.trim() ?? '',
  )
}

describe('CharacterPage', () => {
  it('renders a prerendered character and its episodes without any request', async () => {
    const paths = trackApiRequests()

    const { container } = await renderPage(AQUA_RICK, seededClient(AQUA_RICK))

    expect(screen.getByRole('heading', { level: 1, name: 'Aqua Rick' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Episodes' })).toBeInTheDocument()
    expect(screen.getByText('Appears in 3 episodes')).toBeInTheDocument()
    expect(episodeNames(container)).toEqual([
      'Close Rick-counters of the Rick Kind',
      'The Rickshank Rickdemption',
      'The Ricklantis Mixup',
    ])
    expect(paths).toEqual([])
  })

  it('leads back to the list through the back link and the breadcrumb trail', async () => {
    await renderPage(AQUA_RICK, seededClient(AQUA_RICK))

    expect(screen.getByRole('link', { name: 'Back to characters' })).toHaveAttribute('href', '/')
    const trail = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(trail.getByRole('link', { name: 'Characters' })).toHaveAttribute('href', '/')
    expect(trail.getByText('Aqua Rick')).toHaveAttribute('aria-current', 'page')
  })

  it('shows one state per region: the skeletons, then the character and its episodes', async () => {
    const { container } = await renderPage(AQUA_RICK)

    expect(container.querySelectorAll('#profile [data-state]')).toHaveLength(1)
    expect(container.querySelector('#profile [data-state]')).toHaveAttribute(
      'data-state',
      'loading',
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Loading character…')

    await vi.waitFor(() => {
      expect(container.querySelector('#episodes [data-state]')).toHaveAttribute(
        'data-state',
        'ready',
      )
    })
    expect(container.querySelectorAll('#profile [data-state]')).toHaveLength(1)
    expect(container.querySelectorAll('#episodes [data-state]')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Aqua Rick' })).toBeInTheDocument()
  })

  it('reserves one skeleton row per episode while the episodes load', async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.get(`${API}/episode/:ids`, async () => {
        await gate
      }),
    )
    const { container } = await renderPage(AQUA_RICK)

    await vi.waitFor(() => {
      expect(container.querySelector('#episodes [data-state="loading"]')).toBeInTheDocument()
    })
    expect(container.querySelectorAll('.episode-list-skeleton__item')).toHaveLength(3)

    release()
    await vi.waitFor(() => {
      expect(container.querySelectorAll('#episodes li')).toHaveLength(3)
    })
  })

  it('shows the not-found view for an id the API does not know', async () => {
    await renderPage(99999)

    await vi.waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: "Wrong dimension. We couldn't find this page.",
        }),
      ).toBeInTheDocument()
    })
    expect(screen.getByText('No character has the ID 99999.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })

  it('offers Try again when the API fails, and loads the character on retry', async () => {
    server.use(
      http.get(`${API}/character/:ids`, () => apiJson({ error: 'boom' }, 500), { once: true }),
    )
    const { user, region } = await renderPage(
      AQUA_RICK,
      seed(AQUA_RICK, { detail: false, episodes: true }),
    )
    await vi.waitFor(() => {
      expect(region('#profile').getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    })

    await user.click(region('#profile').getByRole('button', { name: 'Try again' }))

    await vi.waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Aqua Rick' })).toBeInTheDocument()
    })
  })

  it('keeps the profile when only the episodes fail, and retries them in place', async () => {
    server.use(
      http.get(`${API}/episode/:ids`, () => apiJson({ error: 'boom' }, 500), { once: true }),
    )
    const { user, region } = await renderPage(
      AQUA_RICK,
      seed(AQUA_RICK, { detail: true, episodes: false }),
    )

    await vi.waitFor(() => {
      expect(region('#episodes').getByText("Couldn't load episodes.")).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Aqua Rick' })).toBeInTheDocument()

    await user.click(region('#episodes').getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Episodes' })).toHaveFocus()
    await vi.waitFor(() => {
      expect(region('#episodes').getAllByRole('listitem')).toHaveLength(3)
    })
  })
})
