import { render, screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import type { EpisodeView } from '../model/types'
import EpisodeList from './EpisodeList.vue'

const EPISODES: EpisodeView[] = [
  {
    id: 1,
    name: 'Pilot',
    code: 'S01E01',
    airDate: 'December 2, 2013',
    airDateIso: '2013-12-02',
  },
  {
    id: 2,
    name: 'Lawnmower Dog',
    code: 'S01E02',
    airDate: 'Sometime in 2013',
    airDateIso: null,
  },
]

describe('EpisodeList', () => {
  it('lists the episodes in order with their code', () => {
    render(EpisodeList, { props: { episodes: EPISODES } })

    const rows = within(screen.getByRole('list'))
      .getAllByRole('listitem')
      .map((item) =>
        [...item.querySelectorAll('p')].map((line) =>
          line.textContent.replaceAll(/\s+/g, ' ').trim(),
        ),
      )
    expect(rows).toEqual([
      ['Pilot', 'S01E01 · December 2, 2013'],
      ['Lawnmower Dog', 'S01E02 · Sometime in 2013'],
    ])
  })

  it('marks a parsed air date up as a machine-readable time', () => {
    const { container } = render(EpisodeList, { props: { episodes: EPISODES } })

    const times = container.querySelectorAll('time')
    expect(times).toHaveLength(1)
    expect(times[0]).toHaveAttribute('datetime', '2013-12-02')
    expect(times[0]).toHaveTextContent('December 2, 2013')
  })

  it('keeps the full name available when a long one is cut short', () => {
    render(EpisodeList, { props: { episodes: EPISODES } })

    expect(screen.getByText('Lawnmower Dog')).toHaveAttribute('title', 'Lawnmower Dog')
  })
})
