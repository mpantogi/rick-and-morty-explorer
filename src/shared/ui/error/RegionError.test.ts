import { render, screen } from '@testing-library/vue'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import RegionError from './RegionError.vue'

describe('RegionError', () => {
  it('names what failed and blames the API for a server failure', () => {
    render(RegionError, { props: { errorCase: 'server', subject: 'characters' } })

    expect(screen.getByText("Couldn't load characters.")).toBeInTheDocument()
    expect(
      screen.getByText("The Rick and Morty API isn't responding right now."),
    ).toBeInTheDocument()
  })

  it('points at the connection for other failures', () => {
    render(RegionError, { props: { errorCase: 'unknown', subject: 'episodes' } })

    expect(screen.getByText('Check your connection and try again.')).toBeInTheDocument()
  })

  it('emits retry and leaves announcing to the toast', async () => {
    const user = userEvent.setup()
    const view = render(RegionError, { props: { errorCase: 'server', subject: 'favorites' } })

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(view.emitted('retry')).toHaveLength(1)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
