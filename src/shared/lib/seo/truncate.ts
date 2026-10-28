const ELLIPSIS = '…'
const WHITESPACE = /\s/

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const room = text.slice(0, max - ELLIPSIS.length)
  const cutsAtBoundary = WHITESPACE.test(text.charAt(room.length))
  const boundary = cutsAtBoundary ? room.length : room.lastIndexOf(' ')
  const head = boundary > 0 ? room.slice(0, boundary) : room
  return `${head.trimEnd()}${ELLIPSIS}`
}
