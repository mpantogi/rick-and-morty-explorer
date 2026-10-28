import { toast } from 'vue-sonner'

import { reportError } from '../report-error'

// The in-memory state carries on; the visitor learns that it will not survive a reload.
export function reportStorageError(error: unknown): void {
  reportError(error, 'storage')
  toast.error("Couldn't save in this browser", {
    id: 'storage-error',
    description: 'Storage is full or blocked.',
  })
}
