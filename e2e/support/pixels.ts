import type { Locator, Page } from '@playwright/test'

// Wide enough to catch a ring drawn just outside the element, narrower than the grid gap.
const MARGIN_PX = 8
// Re-rendering the same pixels shifts a channel by at most a few levels of anti-aliasing.
const CHANNEL_TOLERANCE = 16
const RGBA = 4

export async function captureAround(locator: Locator): Promise<Buffer> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('The element has no box to capture')
  return locator.page().screenshot({
    clip: {
      x: box.x - MARGIN_PX,
      y: box.y - MARGIN_PX,
      width: box.width + 2 * MARGIN_PX,
      height: box.height + 2 * MARGIN_PX,
    },
  })
}

// Decodes both PNGs in the browser, so comparing them needs no image library.
export function countChangedPixels(page: Page, before: Buffer, after: Buffer): Promise<number> {
  return page.evaluate(
    async ({ images, tolerance, stride }) => {
      const decode = async (base64: string) => {
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('No 2D canvas context')
        context.drawImage(bitmap, 0, 0)
        return context.getImageData(0, 0, bitmap.width, bitmap.height).data
      }
      const [first, second] = await Promise.all(images.map(decode))
      let changed = 0
      for (let index = 0; index < first.length; index += stride) {
        const delta = [0, 1, 2].map((channel) =>
          Math.abs(first[index + channel] - second[index + channel]),
        )
        if (Math.max(...delta) > tolerance) changed += 1
      }
      return changed
    },
    {
      images: [before.toString('base64'), after.toString('base64')],
      tolerance: CHANNEL_TOLERANCE,
      stride: RGBA,
    },
  )
}
