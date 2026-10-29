import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { buildCsp, CspError, injectCsp, inlineScripts } from './csp'

const API_ORIGIN = 'https://rickandmortyapi.com'
const THEME_SCRIPT =
  "try{if(localStorage.getItem('rme:theme')==='dark')document.documentElement.classList.add('dark')}catch{}"
const STATE_SCRIPT = 'window.__INITIAL_STATE__="{\\"vueQuery\\":{}}"'
// The example from MDN's CSP script-src documentation, hashed independently of this code.
const KNOWN_SCRIPT = "alert('Hello, world.');"
const KNOWN_HASH = "'sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng='"

interface PageParts {
  head?: string
  body?: string
  charset?: boolean
}

function page({ head = '', body = '', charset = true }: PageParts = {}): string {
  return [
    '<!DOCTYPE html><html lang="en"><head>',
    charset ? '<meta charset="utf-8">' : '',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<script>${THEME_SCRIPT}</script>`,
    '<script type="module" crossorigin="" src="/assets/app.js"></script>',
    head,
    '</head><body><div id="app" data-server-rendered="true"><main>Rick</main></div>',
    body,
    '</body></html>',
  ].join('')
}

function cspOf(html: string): string {
  return /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html)?.[1] ?? ''
}

function directive(policy: string, name: string): string | undefined {
  return policy.split('; ').find((part) => part.startsWith(`${name} `))
}

const options = { templateScripts: [THEME_SCRIPT], apiOrigin: API_ORIGIN }

// Computed here from node:crypto, apart from the module under test.
function sha256Source(text: string): string {
  return `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`
}

describe('inlineScripts', () => {
  it('returns the inline executable scripts and skips external and JSON-LD ones', () => {
    const html = page({
      head: '<script type="application/ld+json" data-hid="jsonld">{"@type":"Person"}</script>',
      body: `<script>${STATE_SCRIPT}</script><script type="application/json">{}</script>`,
    })

    expect(inlineScripts(html)).toEqual([THEME_SCRIPT, STATE_SCRIPT])
  })
})

describe('script hashes', () => {
  const scriptSrcOf = (script: string) =>
    directive(
      cspOf(
        injectCsp(`<meta charset="utf-8"><script>${script}</script>`, {
          templateScripts: [script],
          apiOrigin: API_ORIGIN,
        }),
      ),
      'script-src',
    )

  it('hashes the exact script text as CSP sha256 sources', () => {
    expect(scriptSrcOf(KNOWN_SCRIPT)).toBe(`script-src 'self' ${KNOWN_HASH}`)
  })

  it('treats whitespace as part of the script', () => {
    expect(scriptSrcOf(` ${KNOWN_SCRIPT}`)).not.toContain(KNOWN_HASH)
  })
})

describe('buildCsp', () => {
  const policy = buildCsp([KNOWN_HASH], API_ORIGIN)

  it('pins every directive of the policy', () => {
    expect(policy).toBe(
      [
        "default-src 'self'",
        `script-src 'self' ${KNOWN_HASH}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' https:",
        `connect-src 'self' ${API_ORIGIN}`,
        "font-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    )
  })

  it('allows scripts from this origin and the hashed inline ones only', () => {
    expect(directive(policy, 'script-src')).toBe(`script-src 'self' ${KNOWN_HASH}`)
    expect(policy).not.toContain('unsafe-eval')
    expect(directive(policy, 'script-src')).not.toContain('unsafe-inline')
  })

  it('lets data come from the API and images from any secure origin', () => {
    expect(directive(policy, 'connect-src')).toBe(`connect-src 'self' ${API_ORIGIN}`)
    expect(directive(policy, 'img-src')).toBe("img-src 'self' https:")
    expect(directive(policy, 'default-src')).toBe("default-src 'self'")
  })

  it('locks down plugins, the base URL and form targets', () => {
    expect(directive(policy, 'object-src')).toBe("object-src 'none'")
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(policy, 'form-action')).toBe("form-action 'self'")
  })

  it('never upgrades insecure requests, which breaks WebKit on http://localhost', () => {
    expect(policy).not.toContain('upgrade-insecure-requests')
  })
})

describe('injectCsp', () => {
  it('inserts the policy right after the charset, ahead of every script', () => {
    const html = injectCsp(page(), options)

    const metaAt = html.indexOf('<meta http-equiv="Content-Security-Policy"')
    expect(metaAt).toBe(html.indexOf('<meta charset="utf-8">') + '<meta charset="utf-8">'.length)
    expect(metaAt).toBeLessThan(html.indexOf('<script'))
  })

  it('hashes the theme script and the vite-ssg state script of the page', () => {
    const html = page({ body: `<script>${STATE_SCRIPT}</script>` })

    const policy = cspOf(injectCsp(html, options))

    expect(directive(policy, 'script-src')).toBe(
      `script-src 'self' ${[THEME_SCRIPT, STATE_SCRIPT].map(sha256Source).join(' ')}`,
    )
  })

  it('leaves the rest of the page untouched', () => {
    const html = page()

    expect(injectCsp(html, options).replace(/<meta http-equiv=[^>]+>/, '')).toBe(html)
  })

  it('refuses a page without a charset meta, which the policy must follow', () => {
    expect(() => injectCsp(page({ charset: false }), options)).toThrow(CspError)
  })

  it('refuses any inline script beyond the template and the state script', () => {
    const html = page({ body: '<script>alert(1)</script>' })

    expect(() => injectCsp(html, options)).toThrow(CspError)
  })

  it.each([
    ['a data-src attribute', '<script data-src="/x.js">alert(1)</script>'],
    ['a data-type attribute', '<script data-type="application/json">alert(1)</script>'],
  ])('refuses an inline script that only looks external or inert through %s', (_, script) => {
    expect(() => injectCsp(page({ body: script }), options)).toThrow(CspError)
  })

  it('accepts a state script that ends with a semicolon', () => {
    const html = page({ body: `<script>${STATE_SCRIPT};</script>` })

    expect(() => injectCsp(html, options)).not.toThrow()
  })

  it.each([
    ['code after the state', 'window.__INITIAL_STATE__=1;alert(1)'],
    ['code after the state string', `${STATE_SCRIPT};alert(1)`],
    ['an object literal instead of a JSON string', 'window.__INITIAL_STATE__={"vueQuery":{}}'],
    ['a JSON string that holds no object', 'window.__INITIAL_STATE__="[1]"'],
    ['a JSON string that holds null', 'window.__INITIAL_STATE__="null"'],
    ['a JSON string that is not JSON', 'window.__INITIAL_STATE__="alert(1)"'],
    ['another global', 'window.__OTHER_STATE__="{}"'],
  ])('refuses a state script with %s', (_, script) => {
    const html = page({ body: `<script>${script}</script>` })

    expect(() => injectCsp(html, options)).toThrow(CspError)
  })

  it('refuses a second state script', () => {
    const state = `<script>${STATE_SCRIPT}</script>`

    expect(() => injectCsp(page({ body: state + state }), options)).toThrow(CspError)
  })

  it('refuses a page whose theme script differs from the template by a single byte', () => {
    const html = page().replace(THEME_SCRIPT, `${THEME_SCRIPT};`)

    expect(() => injectCsp(html, options)).toThrow(CspError)
  })
})
