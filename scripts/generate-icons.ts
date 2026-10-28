// Renders the brand mark into the favicon set, the manifest icons and the social card in public/.
// Run `yarn icons` after changing the mark (src/shared/ui/brand/logo-mark.ts) and commit the output.
import { writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { type Browser, chromium } from '@playwright/test'

import { SITE } from '../src/shared/config/site.ts'
import { LOGO_MARK } from '../src/shared/ui/brand/logo-mark.ts'

const PUBLIC_DIR = resolve(import.meta.dirname, '..', 'public')

// Tailwind 4.3.3 palette values behind the app's tokens (oklch converted to sRGB hex).
const COLOR = {
  canvas: '#f9fafb', // gray-50
  darkCanvas: '#202329',
  fg: '#101828', // gray-900
  darkFg: '#f9fafb', // gray-50
  accent: '#ca3500', // orange-700
  darkAccent: '#ff8904', // orange-400
  darkMuted: '#99a1af', // gray-400
} as const

const FAVICON_SIZE = 32
const APPLE_TOUCH_SIZE = 180
const MANIFEST_ICON_SIZES = [192, 512] as const
const OG_IMAGE = { width: 1200, height: 630 } as const
const OG_MARK_SIZE = 160
const OG_TAGLINE = 'Browse, filter and favorite every character'
const FONT_STACK =
  "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"

// An ICO file here is a 6-byte header and one 16-byte directory entry, followed by the PNG itself.
const ICO_HEADER_BYTES = 6
const ICO_ENTRY_BYTES = 16
const ICO_TYPE_ICON = 1
const ICO_IMAGE_COUNT = 1
const ICO_COLOR_PLANES = 1
const ICO_BITS_PER_PIXEL = 32

interface MarkColors {
  ring: string
  spiral: string
}

function markSvg({ ring, spiral }: MarkColors, size: number): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_MARK.viewBox}" width="${String(size)}" height="${String(size)}"`,
    ` fill="none" stroke-width="${String(LOGO_MARK.strokeWidth)}" stroke-linecap="round">`,
    `<circle cx="${String(LOGO_MARK.ring.cx)}" cy="${String(LOGO_MARK.ring.cy)}" r="${String(LOGO_MARK.ring.r)}" stroke="${ring}"/>`,
    `<path d="${LOGO_MARK.spiral}" stroke="${spiral}"/>`,
    '</svg>',
  ].join('')
}

// Transparent, with the light or dark theme's colours following the browser's colour scheme.
function faviconSvg(): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_MARK.viewBox}" fill="none" stroke-width="${String(LOGO_MARK.strokeWidth)}" stroke-linecap="round">`,
    `<style>.ring{stroke:${COLOR.fg}}.spiral{stroke:${COLOR.accent}}`,
    `@media (prefers-color-scheme:dark){.ring{stroke:${COLOR.darkFg}}.spiral{stroke:${COLOR.darkAccent}}}</style>`,
    `<circle class="ring" cx="${String(LOGO_MARK.ring.cx)}" cy="${String(LOGO_MARK.ring.cy)}" r="${String(LOGO_MARK.ring.r)}"/>`,
    `<path class="spiral" d="${LOGO_MARK.spiral}"/>`,
    '</svg>',
    '',
  ].join('\n')
}

function iconHtml(size: number): string {
  return `<!doctype html><style>body{margin:0;background:${COLOR.canvas}}svg{display:block}</style>${markSvg({ ring: COLOR.fg, spiral: COLOR.accent }, size)}`
}

function ogImageHtml(): string {
  return [
    '<!doctype html><style>',
    `body{margin:0;width:${String(OG_IMAGE.width)}px;height:${String(OG_IMAGE.height)}px;box-sizing:border-box;padding:0 96px;`,
    `display:flex;flex-direction:column;justify-content:center;background:${COLOR.darkCanvas};font-family:${FONT_STACK}}`,
    `h1{margin:48px 0 0;font-size:72px;font-weight:700;letter-spacing:-0.025em;color:${COLOR.darkFg}}`,
    `p{margin:16px 0 0;font-size:36px;color:${COLOR.darkMuted}}`,
    '</style>',
    markSvg({ ring: COLOR.darkFg, spiral: COLOR.darkAccent }, OG_MARK_SIZE),
    `<h1>${SITE.name}</h1><p>${OG_TAGLINE}</p>`,
  ].join('')
}

function toIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(ICO_HEADER_BYTES + ICO_ENTRY_BYTES)
  let offset = 0
  const write = (value: number, bytes: 1 | 2 | 4) => {
    header.writeUIntLE(value, offset, bytes)
    offset += bytes
  }
  write(0, 2) // reserved
  write(ICO_TYPE_ICON, 2)
  write(ICO_IMAGE_COUNT, 2)
  write(size, 1) // width
  write(size, 1) // height
  write(0, 1) // no palette
  write(0, 1) // reserved
  write(ICO_COLOR_PLANES, 2)
  write(ICO_BITS_PER_PIXEL, 2)
  write(png.length, 4)
  write(ICO_HEADER_BYTES + ICO_ENTRY_BYTES, 4) // where the PNG starts
  return Buffer.concat([header, png])
}

async function screenshot(
  browser: Browser,
  html: string,
  viewport: { width: number; height: number },
): Promise<Buffer> {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  try {
    await page.setContent(html)
    return await page.screenshot({ type: 'png' })
  } finally {
    await page.close()
  }
}

function square(browser: Browser, size: number): Promise<Buffer> {
  return screenshot(browser, iconHtml(size), { width: size, height: size })
}

function manifest(): string {
  const icons = MANIFEST_ICON_SIZES.map((size) => ({
    src: `/icon-${String(size)}.png`,
    sizes: `${String(size)}x${String(size)}`,
    type: 'image/png',
  }))
  const webManifest = {
    name: SITE.name,
    short_name: 'R&M Explorer',
    start_url: '/',
    display: 'browser',
    background_color: COLOR.canvas,
    theme_color: COLOR.canvas,
    icons,
  }
  return `${JSON.stringify(webManifest, null, 2)}\n`
}

async function renderAssets(browser: Browser): Promise<Record<string, string | Buffer>> {
  const [favicon, appleTouch, ogImage, ...manifestIcons] = await Promise.all([
    square(browser, FAVICON_SIZE),
    square(browser, APPLE_TOUCH_SIZE),
    screenshot(browser, ogImageHtml(), OG_IMAGE),
    ...MANIFEST_ICON_SIZES.map((size) => square(browser, size)),
  ])
  return {
    'favicon.svg': faviconSvg(),
    'favicon.ico': toIco(favicon, FAVICON_SIZE),
    'apple-touch-icon.png': appleTouch,
    'og-image.png': ogImage,
    'site.webmanifest': manifest(),
    ...Object.fromEntries(
      MANIFEST_ICON_SIZES.map((size, index) => [`icon-${String(size)}.png`, manifestIcons[index]]),
    ),
  }
}

const browser = await chromium.launch()
try {
  const files = await renderAssets(browser)
  await Promise.all(
    Object.entries(files).map(([name, content]) => writeFile(join(PUBLIC_DIR, name), content)),
  )
  process.stdout.write(`Wrote ${Object.keys(files).join(', ')} to ${PUBLIC_DIR}\n`)
} finally {
  await browser.close()
}
