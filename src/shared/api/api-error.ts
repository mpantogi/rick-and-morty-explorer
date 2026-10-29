type ApiErrorKind = 'http' | 'network' | 'timeout' | 'parse'

const HTTP_NOT_FOUND = 404
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_SERVER_ERROR = 500

export class ApiError extends Error {
  override readonly name = 'ApiError'
  readonly kind: ApiErrorKind
  readonly status: number | undefined

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.kind = kind
    this.status = options.status
  }

  get isNotFound(): boolean {
    return this.kind === 'http' && this.status === HTTP_NOT_FOUND
  }

  get isRetryable(): boolean {
    if (this.kind === 'network' || this.kind === 'timeout') return true
    if (this.kind !== 'http' || this.status === undefined) return false
    return this.status === HTTP_TOO_MANY_REQUESTS || this.status >= HTTP_SERVER_ERROR
  }
}
