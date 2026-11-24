import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import {
  expectFrameBudget,
  measureFrames,
  measureWhile,
  mount,
  settle,
  setupFrameTests
} from '@oztix/roadie-frames'

import { FileUpload } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
import { EventPage } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

/** A photo-sized PNG, so each row draws a real thumbnail. */
async function photo(index: number) {
  const canvas = new OffscreenCanvas(1200, 800)
  const context = canvas.getContext('2d')!
  context.fillStyle = `hsl(${index * 60} 70% 50%)`
  context.fillRect(0, 0, 1200, 800)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new File([blob], `photo-${index + 1}.png`, { type: 'image/png' })
}

describe('FileUpload animates at 60fps on a slowed CPU', () => {
  it('shows six uploads progressing together', async () => {
    const reports: ((progress: number) => void)[] = []
    const container = await mount(
      <EventPage>
        {Array.from({ length: 6 }, (_, index) => (
          <FileUpload
            key={index}
            accept='image/*'
            onUpload={(_, { onProgress }) => {
              reports.push(onProgress)
              return new Promise(() => {})
            }}
          />
        ))}
      </EventPage>
    )
    const inputs = container.querySelectorAll('input[type=file]')
    for (const [index, input] of [...inputs].entries()) {
      const transfer = new DataTransfer()
      transfer.items.add(await photo(index))
      Object.assign(input, { files: transfer.files })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
    // The thumbnails decode and the rows pop in before the measure.
    await settle(30)
    expect(container.querySelectorAll('[role=progressbar]')).toHaveLength(6)
    expect(container.querySelectorAll('img')).toHaveLength(6)

    await expectFrameBudget(
      'FileUpload, six uploads progressing',
      await measureFrames((index) => {
        for (const report of reports) report(index / 120)
      })
    )
  })
})

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
  // After a drop the drag library covers the pointer until it moves.
  beforeEach(() => commands.pointer([{ type: 'move', x: 1, y: 1, steps: 2 }]))
  afterEach(releaseDragPointer)

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
