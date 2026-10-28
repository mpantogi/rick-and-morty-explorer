import type { ListState } from '@/entities/character'

// Polite status text for the results region; it also names the in-between states.
export function resultsSummary(state: ListState, page: number): string {
  switch (state.kind) {
    case 'loading':
      return 'Loading characters…'
    case 'error':
      return "Characters couldn't load"
    case 'empty':
      return state.reason === 'out-of-range'
        ? `There's no page ${page}.`
        : 'No characters match these filters'
    case 'ready': {
      if (state.isUpdating) return 'Updating results…'
      const { rangeStart, rangeEnd, total } = state.page
      if (total === 1) return 'Showing 1 of 1 character'
      return `Showing ${rangeStart}–${rangeEnd} of ${total} characters`
    }
    default:
      return state satisfies never
  }
}
