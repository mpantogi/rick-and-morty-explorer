export function reportError(error: unknown, context: string): void {
  // The one sanctioned console call: unrecovered errors surface here instead of vanishing.
  console.error(`[${context}]`, error)
}
