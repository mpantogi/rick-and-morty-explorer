import { useQuery } from '@tanstack/vue-query'
import { computed, type ComputedRef, type Ref } from 'vue'

import { toErrorCase } from '@/shared/api'
import type { AsyncState } from '@/shared/lib'

import { episodeQueries } from '../api/queries'
import { toEpisodeView } from './mappers'
import type { EpisodeView } from './types'

interface Episodes {
  state: ComputedRef<AsyncState<EpisodeView[]>>
  retry: () => Promise<void>
}

const NO_EPISODES: AsyncState<EpisodeView[]> = { kind: 'ready', data: [] }
const LOADING: AsyncState<EpisodeView[]> = { kind: 'loading' }

export function useEpisodes(ids: Readonly<Ref<readonly number[]>>): Episodes {
  const sortedIds = computed(() => [...ids.value].sort((a, b) => a - b))
  const query = useQuery(() => ({
    ...episodeQueries.byIds(sortedIds.value),
    enabled: sortedIds.value.length > 0 && !import.meta.env.SSR,
  }))

  const state = computed<AsyncState<EpisodeView[]>>(() => {
    if (sortedIds.value.length === 0) return NO_EPISODES
    if (query.status.value === 'error') {
      return { kind: 'error', errorCase: toErrorCase(query.error.value) }
    }
    const data = query.data.value
    return data === undefined ? LOADING : { kind: 'ready', data: data.map(toEpisodeView) }
  })

  return {
    state,
    retry: async () => {
      await query.refetch()
    },
  }
}
