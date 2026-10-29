export function reportError(error: unknown, context: string): void {
  // eslint-disable-next-line no-console -- the one sanctioned console call: every error a developer must see
  console.error(`[${context}]`, error)
}
