import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type ComputedRef, type Ref } from 'vue'

import { toErrorCase } from '@/shared/api'
import type { AsyncState } from '@/shared/lib'

import { characterQueries } from '../api/queries'
import { findCachedCharacter } from './find-cached-character'
import { toCharacterView } from './mappers'
import type { CharacterView } from './types'

interface Character {
  state: ComputedRef<AsyncState<CharacterView>>
  retry: () => Promise<void>
}

const LOADING: AsyncState<CharacterView> = { kind: 'loading' }

export function useCharacter(id: Readonly<Ref<number>>): Character {
  const queryClient = useQueryClient()
  const query = useQuery(() => ({
    ...characterQueries.detail(id.value),
    initialData: () => findCachedCharacter(queryClient, id.value),
    enabled: !import.meta.env.SSR,
  }))

  const state = computed<AsyncState<CharacterView>>(() => {
    if (query.status.value === 'error') {
      return { kind: 'error', errorCase: toErrorCase(query.error.value) }
    }
    const data = query.data.value
    return data === undefined ? LOADING : { kind: 'ready', data: toCharacterView(data) }
  })

  return {
    state,
    retry: async () => {
      await query.refetch()
    },
  }
}
