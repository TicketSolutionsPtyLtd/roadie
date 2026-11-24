import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  settle,
  setupFrameTests
} from '@oztix/roadie-frames'

import { FileUpload } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
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
