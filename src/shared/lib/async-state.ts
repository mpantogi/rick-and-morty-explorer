import type { ErrorCase } from '@/shared/api'

export type AsyncState<T> =
  { kind: 'loading' } | { kind: 'ready'; data: T } | { kind: 'error'; errorCase: ErrorCase }
