import type {} from '@vitest/browser-playwright'
import type { BrowserCommand } from 'vitest/node'

import type { PointerStep } from './pointer'

export type { PointerStep }

/**
 * A real mouse, so a test sees the browser's own pointer events, native drag
 * and drop, and the frames a moving pointer wakes. Points are in the test
 * frame's CSS pixels; the frame may sit offset and scaled.
 */
export const pointer: BrowserCommand<[steps: PointerStep[]]> = async (
  { page, frame },
  steps
) => {
  const testFrame = await frame()
  const box = await (await testFrame.frameElement()).boundingBox()
  if (!box) throw new Error('The test frame has no box')
  const width = await testFrame.evaluate(() => window.innerWidth)
  const scale = box.width / width
  for (const step of steps) {
    if (step.type === 'move')
      await page.mouse.move(box.x + step.x * scale, box.y + step.y * scale, {
        steps: step.steps ?? 1
      })
    else if (step.type === 'down') await page.mouse.down()
    else if (step.type === 'up') await page.mouse.up()
    else await page.waitForTimeout(step.ms)
  }
}
