import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import {
  expectFrameBudget,
  measureWhile,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { FileUpload } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'

setupFrameTests({ css: roadieCss })
// After a drop the drag library covers the pointer until it moves.
beforeEach(() => commands.pointer([{ type: 'move', x: 1, y: 1, steps: 2 }]))
afterEach(releaseDragPointer)

const DOCUMENTS = [
  'Tech rider.pdf',
  'Stage plot.png',
  'Run sheet.pdf',
  'Hospitality.pdf',
  'Guest list.csv',
  'Venue map.png'
].map((name) => new File(['x'.repeat(4096)], name))

const centre = (element: Element) => {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

describe('FileUpload reorders at 60fps on a slowed CPU', () => {
  it('drags the first of 6 files to the end', async () => {
    const root = await mount(
      <div style={{ width: 480 }}>
        <FileUpload maxFiles={6} defaultValue={DOCUMENTS} />
      </div>,
      { frames: 30 }
    )
    const from = centre(
      root.querySelector('button[aria-label="Reorder Tech rider.pdf"]')!
    )
    const to = centre(root.querySelectorAll('li')[5]!)
    await expectFrameBudget(
      'FileUpload, drag down 6 files',
      await measureWhile(() =>
        commands.pointer([
          { type: 'move', ...from },
          { type: 'down' },
          { type: 'move', x: from.x, y: from.y + 12, steps: 4 },
          { type: 'move', x: to.x, y: to.y + 20, steps: 60 },
          { type: 'up' }
        ])
      )
    )
    await expect
      .poll(() =>
        root
          .querySelector('button[aria-label^="Reorder "]')
          ?.getAttribute('aria-label')
      )
      .toBe('Reorder Stage plot.png')
  })
})
