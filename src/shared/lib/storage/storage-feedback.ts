import { toast } from 'vue-sonner'

import { MAX_FAVORITES, MAX_HEROES } from '@/shared/config'

import { reportError } from '../report-error'

// The in-memory state carries on; the visitor learns that it will not survive a reload.
export function reportStorageError(error: unknown): void {
  reportError(error, 'storage')
  toast.error("Couldn't save in this browser", {
    id: 'storage-error',
    description: 'Storage is full or blocked.',
  })
}

// The stores refuse an addition at their cap; the caller tells the visitor why.
export function showStorageLimit(): void {
  toast.error('Limit reached', {
    id: 'storage-limit',
    description: `You can save up to ${MAX_HEROES} heroes and ${MAX_FAVORITES.toLocaleString('en-US')} favorites.`,
  })
}
