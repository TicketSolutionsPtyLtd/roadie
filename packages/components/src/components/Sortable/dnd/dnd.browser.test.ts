import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { createSortableGroup, sortableDropZone } from '.'
import { releaseDragPointer } from '../../../css/testUtils'

const cleanups: (() => void)[] = []
afterEach(async () => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  document.body.replaceChildren()
  await releaseDragPointer()
})

function box(text: string) {
  const element = document.createElement('div')
  element.textContent = text
  element.style.padding = '16px'
  document.body.append(element)
  return element
}

describe('sortableDropZone', () => {
  it('leaves a drag from another drag feature to it', async () => {
    const zone = box('Zone')
    const card = box('Card')
    const onActiveChange = vi.fn()
    const onDrop = vi.fn()
    cleanups.push(
      sortableDropZone({
        element: zone,
        group: createSortableGroup('lanes', 'done'),
        axis: 'vertical',
        accepts: () => true,
        onActiveChange
      }),
      draggable({ element: card, onDrop })
    )
    await userEvent.dragAndDrop(card, zone)
    await vi.waitFor(() => expect(onDrop).toHaveBeenCalled())
    expect(onActiveChange).not.toHaveBeenCalledWith(true)
  })
})
