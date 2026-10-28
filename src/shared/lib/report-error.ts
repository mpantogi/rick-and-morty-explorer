export function reportError(error: unknown, context: string): void {
  // eslint-disable-next-line no-console -- the one sanctioned console call: unrecovered errors surface here
  console.error(`[${context}]`, error)
}
