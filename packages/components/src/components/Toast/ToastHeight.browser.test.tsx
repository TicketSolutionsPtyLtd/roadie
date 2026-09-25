import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Toast, type ToastManager, createToastManager } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

// Transitions stay on here: the bug only shows while the height transition runs.
let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
afterEach(async () => {
  await userEvent.unhover(document.body)
  cleanup()
})

const PADDING = 12
const LONG = {
  title: 'Harbourlight Sessions not published',
  description: 'Check the event for missing details and try again.',
  intent: 'danger'
} as const

function mount() {
  const manager = createToastManager()
  render(
    <Toast.Provider toastManager={manager}>
      <Toast.Viewport />
    </Toast.Provider>
  )
  return manager
}

function toastTitled(title: string) {
  const heading = [
    ...document.querySelectorAll<HTMLElement>('[data-slot="toast-title"]')
  ].find((element) => element.textContent === title)
  return heading?.closest<HTMLElement>('[data-slot="toast"]') ?? null
}

async function settled(manager: ToastManager, title: string) {
  let id = ''
  act(() => {
    id = manager.add({ title, timeout: 0 })
  })
  await waitFor(() => {
    const toast = toastTitled(title)
    expect(toast).not.toHaveAttribute('data-starting-style')
    expect(toast!.style.getPropertyValue('--toast-height')).not.toBe('')
    expect(toast!.getAnimations()).toHaveLength(0)
  })
  return id
}

function expectFits(toast: HTMLElement | null) {
  const box = toast!.getBoundingClientRect()
  const text = toast!
    .querySelector('[data-slot="toast-title"]')!
    .parentElement!.getBoundingClientRect()
  expect(text.top - box.top).toBeGreaterThanOrEqual(PADDING - 1)
  expect(box.bottom - text.bottom).toBeGreaterThanOrEqual(PADDING - 1)
}

describe.each([
  [1280, 800],
  [390, 844]
])('a toast at %ipx', (width, height) => {
  it('grows to fit when updated from short to long content', async () => {
    await page.viewport(width, height)
    const manager = mount()
    const id = await settled(manager, 'Publishing')

    act(() => {
      manager.update(id, LONG)
    })

    await waitFor(() => expectFits(toastTitled(LONG.title)), {
      timeout: 10_000
    })
  })

  it('fits a long toast added while another is leaving', async () => {
    await page.viewport(width, height)
    const manager = mount()
    const id = await settled(manager, 'Link copied')
    act(() => {
      manager.close(id)
      manager.add({ ...LONG, timeout: 0 })
    })

    await waitFor(() => expectFits(toastTitled(LONG.title)), {
      timeout: 10_000
    })
  })

  it('fits each toast in a stack of different heights', async () => {
    await page.viewport(width, height)
    const manager = mount()
    await settled(manager, 'Link copied')
    const id = await settled(manager, 'Publishing')
    act(() => {
      manager.update(id, LONG)
    })

    await waitFor(() => expectFits(toastTitled(LONG.title)), {
      timeout: 10_000
    })

    await userEvent.hover(toastTitled(LONG.title)!)
    await waitFor(
      () => {
        expectFits(toastTitled(LONG.title))
        expectFits(toastTitled('Link copied'))
      },
      { timeout: 10_000 }
    )
  })
})
