// Serves dist/ the way Netlify does (_redirects rewrites, _headers, real 404 status) for `yarn preview`
// and E2E; `vite preview` answers every unknown URL with index.html and 200, so it would test less.
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'

const DIST = resolve(import.meta.dirname, '..', 'dist')
const HOST = '127.0.0.1'
const DEFAULT_PORT = '4173'
const STATUS = {
  ok: 200,
  badRequest: 400,
  notFound: 404,
  methodNotAllowed: 405,
  serverError: 500,
} as const
const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

interface Rewrite {
  from: string[]
  to: string
}

interface HeaderRule {
  path: string
  headers: Record<string, string>
}

interface Reply {
  file: string
  status: number
  headers: Record<string, string>
}

class BadRequestError extends Error {}

async function readOptional(file: string): Promise<string> {
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return ''
    throw error
  }
}

// Netlify `_redirects`: only status-200 rewrites are used by this site.
async function loadRewrites(): Promise<Rewrite[]> {
  const lines = (await readOptional(join(DIST, '_redirects'))).split('\n')
  return lines
    .map((line) => line.trim().split(/\s+/))
    .filter(([from, to, status]) => from && to && !from.startsWith('#') && status === '200')
    .map(([from, to]) => ({ from: from.split('/'), to }))
}

// Netlify `_headers`: an unindented path (exact, or a prefix ending in `*`), then indented headers.
async function loadHeaderRules(): Promise<HeaderRule[]> {
  const rules: HeaderRule[] = []
  for (const line of (await readOptional(join(DIST, '_headers'))).split('\n')) {
    const text = line.trim()
    if (text === '' || text.startsWith('#')) continue
    if (!/^\s/.test(line)) {
      rules.push({ path: text, headers: {} })
      continue
    }
    const colon = text.indexOf(':')
    const rule = rules.at(-1)
    if (rule) rule.headers[text.slice(0, colon).trim()] = text.slice(colon + 1).trim()
  }
  return rules
}

function headersFor(rules: readonly HeaderRule[], path: string): Record<string, string> {
  const matching = rules.filter((rule) =>
    rule.path.endsWith('*') ? path.startsWith(rule.path.slice(0, -1)) : rule.path === path,
  )
  return Object.fromEntries(matching.flatMap((rule) => Object.entries(rule.headers)))
}

function matches(pattern: readonly string[], segments: readonly string[]): boolean {
  if (pattern.at(-1) === '*') return pattern.slice(0, -1).every((part, i) => part === segments[i])
  if (pattern.length !== segments.length) return false
  return pattern.every((part, i) =>
    part.startsWith(':') ? segments[i] !== '' : part === segments[i],
  )
}

function toSafePath(url: string): string {
  let path: string
  try {
    path = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  } catch {
    throw new BadRequestError('Malformed URI')
  }
  if (path.includes('\0') || path.split(/[\\/]/).includes('..')) {
    throw new BadRequestError('Path traversal')
  }
  return path
}

async function findFile(path: string): Promise<string | null> {
  for (const candidate of [path, `${path}.html`, join(path, 'index.html')]) {
    const file = resolve(DIST, `.${candidate}`)
    if (!file.startsWith(`${DIST}${sep}`)) continue
    const info = await stat(file).catch(() => null)
    if (info?.isFile()) return file
  }
  return null
}

// Like Netlify, an unknown extension is octet-stream unless a `_headers` rule sets the type.
function send(req: IncomingMessage, res: ServerResponse, { file, status, headers }: Reply): void {
  res.writeHead(status, {
    'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream',
    ...headers,
  })
  if (req.method === 'HEAD') res.end()
  else createReadStream(file).pipe(res)
}

async function locate(path: string): Promise<Omit<Reply, 'headers'>> {
  const rewrite = rewrites.find((rule) => matches(rule.from, path.split('/')))
  const file = await findFile(rewrite?.to ?? path)
  return file
    ? { file, status: STATUS.ok }
    : { file: join(DIST, '404.html'), status: STATUS.notFound }
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(STATUS.methodNotAllowed, { Allow: 'GET, HEAD' }).end()
    return
  }
  const path = toSafePath(req.url ?? '/')
  send(req, res, { ...(await locate(path)), headers: headersFor(headerRules, path) })
}

const { values } = parseArgs({ options: { port: { type: 'string', default: DEFAULT_PORT } } })
const [rewrites, headerRules] = await Promise.all([loadRewrites(), loadHeaderRules()])

createServer((req, res) => {
  handle(req, res).catch((error: unknown) => {
    const status = error instanceof BadRequestError ? STATUS.badRequest : STATUS.serverError
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }).end(String(error))
  })
}).listen(Number(values.port), HOST, () => {
  process.stdout.write(`Serving ${DIST} at http://localhost:${values.port}/\n`)
})
