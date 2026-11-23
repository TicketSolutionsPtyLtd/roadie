import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import { FileUpload } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const csv = (name: string) => new File(['a,b\n1,2'], name, { type: 'text/csv' })

/** Drags files in from outside the page, as the desktop does, and drops them unless told not to. */
async function dragFiles(target: Element, files: File[], drop = true) {
  const dataTransfer = new DataTransfer()
  for (const file of files) dataTransfer.items.add(file)
  const box = target.getBoundingClientRect()
  const init = {
    bubbles: true,
    cancelable: true,
    dataTransfer,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2
  }
  target.dispatchEvent(new DragEvent('dragenter', init))
  target.dispatchEvent(new DragEvent('dragover', init))
  await new Promise(requestAnimationFrame)
  if (drop) target.dispatchEvent(new DragEvent('drop', init))
}

/** Jumps every transition under element to its end. */
const settle = (element: Element) => {
  for (const animation of element.getAnimations({ subtree: true }))
    animation.finish()
}

const postedFiles = () =>
  new FormData(screen.getByRole('form'))
    .getAll('payments')
    .map((file) => (file as File).name)

describe('FileUpload in a form', () => {
  it('posts its value under name', () => {
    render(
      <form aria-label='Import'>
        <FileUpload name='payments' defaultValue={[csv('march.csv')]}>
          <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
        </FileUpload>
      </form>
    )
    expect(postedFiles()).toEqual(['march.csv'])
  })

  it.each([
    {
      pick: 'a rejected pick',
      props: { accept: '.csv', defaultValue: [csv('march.csv')] },
      file: new File(['%PDF'], 'march.pdf')
    },
    {
      pick: 'a pick its controlling parent ignored',
      props: { value: [csv('march.csv')] },
      file: csv('april.csv')
    }
  ])(
    'keeps posting the last good file after $pick',
    async ({ props, file }) => {
      const { container } = render(
        <form aria-label='Import'>
          <FileUpload name='payments' {...props}>
            <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
          </FileUpload>
        </form>
      )
      const input = container.querySelector('input[type=file]')!
      await userEvent.upload(input, file)
      await waitFor(() => expect(postedFiles()).toEqual(['march.csv']))
    }
  )

  it('moves focus to the Trigger when a required field stops a submit', async () => {
    render(
      <form aria-label='Import' onSubmit={(event) => event.preventDefault()}>
        <FileUpload name='payments' required>
          <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
        </FileUpload>
      </form>
    )
    screen.getByRole<HTMLFormElement>('form').requestSubmit()
    await waitFor(() => expect(screen.getByRole('button')).toHaveFocus())
  })

  it('moves focus to the dropzone when a required field stops a submit', async () => {
    render(
      <form aria-label='Import' onSubmit={(event) => event.preventDefault()}>
        <FileUpload name='payments' required />
      </form>
    )
    screen.getByRole<HTMLFormElement>('form').requestSubmit()
    await waitFor(() => expect(screen.getByRole('button')).toHaveFocus())
  })
})

describe('FileUpload bar', () => {
  it('truncates a long file name and keeps its buttons inside', () => {
    const name = `${'Lampshade Disco final guest list '.repeat(4)}.csv`
    render(
      <div style={{ width: 300 }}>
        <FileUpload defaultValue={[csv(name)]}>
          <FileUpload.Control>
            <FileUpload.Value />
            <FileUpload.Clear />
            <FileUpload.Trigger />
          </FileUpload.Control>
        </FileUpload>
      </div>
    )
    const fileName = screen.getByText(name)
    const bar = fileName.closest('[data-slot=file-upload-control]')!
    expect(bar.getBoundingClientRect().width).toBeLessThanOrEqual(300)
    expect(fileName.getBoundingClientRect().height).toBeLessThanOrEqual(
      bar.clientHeight
    )
    const replace = screen.getByRole('button', { name: /Replace$/ })
    expect(replace.getBoundingClientRect().right).toBeLessThanOrEqual(300)
    const remove = screen.getByRole('button', { name: /^Remove/ })
    expect(
      screen.getByText('7 bytes').getBoundingClientRect().right
    ).toBeLessThanOrEqual(remove.getBoundingClientRect().left)
  })

  it('joins the Trigger to the end of the bar, full height', () => {
    render(
      <FileUpload>
        <FileUpload.Control>
          <FileUpload.Value />
          <FileUpload.Trigger />
        </FileUpload.Control>
      </FileUpload>
    )
    const trigger = screen.getByRole('button', { name: /Choose file$/ })
    const bar = trigger.closest<HTMLElement>('[data-slot=file-upload-control]')!
    const barBox = bar.getBoundingClientRect()
    const box = trigger.getBoundingClientRect()
    expect(box.top).toBeCloseTo(barBox.top + bar.clientTop, 0)
    expect(box.height).toBeCloseTo(bar.clientHeight, 0)
    expect(box.right).toBeCloseTo(
      barBox.left + bar.clientLeft + bar.clientWidth,
      0
    )
  })
})

describe('FileUpload drops', () => {
  it('adds a file dropped on the dropzone', async () => {
    const onValueChange = vi.fn()
    render(<FileUpload onValueChange={onValueChange} />)
    const file = csv('march.csv')
    await dragFiles(screen.getByRole('button'), [file])
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith([file]))
    expect(screen.getByRole('button')).not.toHaveAttribute('data-dragging')
  })

  it('turns solid accent and lifts its tile on the tokens while files are over it', async () => {
    render(
      <>
        <FileUpload />
        {/* The tokens, resolved the way the browser writes them. */}
        <div
          data-testid='reference'
          className='border border-strong transition-transform duration-slow ease-spring-lively intent-accent'
        />
      </>
    )
    const zone = screen.getByRole('button')
    const tile = zone.querySelector('[data-slot=icon-tile]')!
    const rest = tile.getBoundingClientRect()
    await dragFiles(zone, [csv('march.csv')], false)
    await waitFor(() => expect(zone).toHaveAttribute('data-dragging'))
    const expected = getComputedStyle(screen.getByTestId('reference'))
    const tileStyle = getComputedStyle(tile)
    expect(tileStyle.transitionDuration).toBe(expected.transitionDuration)
    expect(tileStyle.transitionTimingFunction).toBe(
      expected.transitionTimingFunction
    )
    settle(zone)
    expect(getComputedStyle(zone).borderTopStyle).toBe('solid')
    expect(getComputedStyle(zone).borderTopColor).toBe(expected.borderTopColor)
    expect(tile.getBoundingClientRect().top).toBeLessThan(rest.top)
    expect(tile.getBoundingClientRect().width).toBeGreaterThan(rest.width)
    await dragFiles(zone, [], true)
  })

  it('ignores a drop while disabled', async () => {
    const onValueChange = vi.fn()
    render(<FileUpload disabled onValueChange={onValueChange} />)
    await dragFiles(screen.getByRole('button'), [csv('march.csv')])
    await new Promise(requestAnimationFrame)
    expect(onValueChange).not.toHaveBeenCalled()
  })
})

describe('FileUpload bar drops', () => {
  const renderBar = (defaultValue?: File[]) => {
    const onValueChange = vi.fn()
    const { container } = render(
      <>
        <FileUpload defaultValue={defaultValue} onValueChange={onValueChange}>
          <FileUpload.Control>
            <FileUpload.Value />
            <FileUpload.Trigger />
          </FileUpload.Control>
        </FileUpload>
        <div
          data-testid='reference'
          className='border border-strong intent-accent'
        />
      </>
    )
    const bar = container.querySelector('[data-slot=file-upload-control]')!
    return { bar, onValueChange }
  }

  it('adds a file dropped on the bar', async () => {
    const { bar, onValueChange } = renderBar()
    const file = csv('march.csv')
    await dragFiles(bar, [file])
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith([file]))
    expect(bar).not.toHaveAttribute('data-dragging')
  })

  it('turns accent and reads "Drop to add" while files are over it', async () => {
    const { bar } = renderBar([csv('march.csv')])
    await dragFiles(bar, [csv('april.csv')], false)
    await waitFor(() => expect(bar).toHaveAttribute('data-dragging'))
    const value = bar.querySelector('[data-slot=file-upload-value]')
    expect(value?.textContent).toBe('Drop to add')
    settle(bar)
    expect(getComputedStyle(bar).borderTopColor).toBe(
      getComputedStyle(screen.getByTestId('reference')).borderTopColor
    )
    await dragFiles(bar, [], true)
  })
})
