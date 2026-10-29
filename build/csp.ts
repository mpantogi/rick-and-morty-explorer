import { createHash } from 'node:crypto'

// Inline scripts the browser executes: no `src`, and not a JSON data block such as JSON-LD.
const INLINE_EXECUTABLE =
  /<script(?![^>]*\bsrc=)(?![^>]*\btype="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/gi
const CHARSET_META = /<meta charset="[^"]*"\s*\/?>/i
const STATE_SCRIPT_PREFIX = 'window.__INITIAL_STATE__='

export class CspError extends Error {
  override readonly name = 'CspError'
}

export interface CspOptions {
  // index.html's own inline scripts (the no-flash theme script), byte for byte.
  readonly templateScripts: readonly string[]
  readonly apiOrigin: string
}

export function inlineScripts(html: string): string[] {
  return [...html.matchAll(INLINE_EXECUTABLE)].map(([, text = '']) => text)
}

export function hashInlineScripts(html: string): string[] {
  return inlineScripts(html).map(
    (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`,
  )
}

// Directives a meta tag cannot carry (frame-ancestors) live in public/_headers.
export function buildCsp(hashes: readonly string[], apiOrigin: string): string {
  return [
    "default-src 'self'",
    ["script-src 'self'", ...hashes].join(' '),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https:",
    `connect-src 'self' ${apiOrigin}`,
    "font-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

function parsesTo(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

// vite-ssg writes `window.__INITIAL_STATE__=` and one JSON string literal holding a JSON object.
function isStateScript(text: string): boolean {
  if (!text.startsWith(STATE_SCRIPT_PREFIX)) return false
  const literal = parsesTo(text.slice(STATE_SCRIPT_PREFIX.length).replace(/;$/, ''))
  if (typeof literal !== 'string') return false
  const state = parsesTo(literal)
  return typeof state === 'object' && state !== null && !Array.isArray(state)
}

// A page may run the template's scripts plus vite-ssg's state script, nothing it gained in render.
function assertExpectedScripts(scripts: readonly string[], template: readonly string[]): void {
  const own = scripts.filter((text) => !isStateScript(text))
  const stateScripts = scripts.length - own.length
  const matchesTemplate =
    own.length === template.length && own.every((text, index) => text === template[index])
  if (stateScripts > 1 || !matchesTemplate) {
    throw new CspError(
      `unexpected inline scripts: expected the ${String(template.length)} from index.html and at most one state script, found ${String(scripts.length)}`,
    )
  }
}

export function injectCsp(html: string, { templateScripts, apiOrigin }: CspOptions): string {
  const charset = CHARSET_META.exec(html)
  if (!charset) throw new CspError('the page has no <meta charset> for the CSP meta to follow')
  assertExpectedScripts(inlineScripts(html), templateScripts)
  const policy = buildCsp(hashInlineScripts(html), apiOrigin)
  const end = charset.index + charset[0].length
  return `${html.slice(0, end)}<meta http-equiv="Content-Security-Policy" content="${policy}">${html.slice(end)}`
}
