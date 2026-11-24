import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi
} from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { FileUpload } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
import { Field } from '../Field'
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

/** Holds every transition under element where it is, so a collapsing row stays. */
const hold = (element: Element) => {
  for (const animation of element.getAnimations({ subtree: true }))
    animation.pause()
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
    expect(
      screen.getByRole('button', { name: /^Drop a file/ })
    ).not.toHaveAttribute('data-dragging')
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

describe('FileUpload list', () => {
  it('fades and collapses a removed row on the tokens, then drops it', async () => {
    render(
      <>
        <FileUpload defaultValue={[csv('march.csv')]} />
        <div
          data-testid='reference'
          className='transition duration-slow ease-spring'
        />
      </>
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove march.csv' })
    )
    const row = screen.getByRole('listitem', { hidden: true })
    expect(row).toHaveAttribute('data-leaving')
    const expected = getComputedStyle(screen.getByTestId('reference'))
    const style = getComputedStyle(row)
    expect(style.transitionDuration.split(', ')[0]).toBe(
      expected.transitionDuration.split(', ')[0]
    )
    expect(style.transitionTimingFunction.split(', ')[0]).toBe(
      expected.transitionTimingFunction.split(', ')[0]
    )
    settle(row)
    expect(getComputedStyle(row).opacity).toBe('0')
    expect(row.getBoundingClientRect().height).toBe(0)
    await waitFor(() => expect(screen.queryByRole('list')).toBeNull())
  })

  it('drops a removed row at once when motion is reduced', async () => {
    await commands.reduceMotion(true)
    onTestFinished(() => commands.reduceMotion(false))
    render(<FileUpload defaultValue={[csv('march.csv')]} />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove march.csv' })
    )
    // Well inside the 300ms collapse it would otherwise run.
    await expect
      .poll(() => screen.queryByRole('list'), { timeout: 150, interval: 10 })
      .toBeNull()
  })
})

/** A real PNG, so the browser decodes it. */
async function png(name: string, width = 400, height = 200) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = 'rebeccapurple'
  context.fillRect(0, 0, width, height)
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((made) => resolve(made!), 'image/png')
  )
  return new File([blob], name, { type: 'image/png' })
}

describe('FileUpload previews', () => {
  it('shows a preview only once it has decoded, scaled to cover the tile', async () => {
    // Wide, so a width-only resize would leave it short of the square tile.
    const poster = await png('poster.png', 1600, 400)
    // The img as it joins the page.
    const seen: { complete: boolean; width: number; height: number }[] = []
    const observer = new MutationObserver(() => {
      const img = document.querySelector('img')
      if (img && !seen.length)
        seen.push({
          complete: img.complete,
          width: img.naturalWidth,
          height: img.naturalHeight
        })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    onTestFinished(() => observer.disconnect())
    render(<FileUpload defaultValue={[poster]} />)
    await waitFor(() => expect(seen).toHaveLength(1))
    const tile = document.querySelector('[data-slot=file-upload-item-preview]')!
    const side = Math.ceil(tile.clientHeight * devicePixelRatio)
    expect(seen[0]).toEqual({ complete: true, width: side * 4, height: side })
  })

  it('keeps a large image inside a single-image slot', async () => {
    render(
      <div style={{ width: 300 }}>
        <FileUpload
          defaultValue={[await png('poster.png', 2400, 1200)]}
          className='aspect-2/1 w-full *:col-start-1 *:row-start-1'
        >
          <FileUpload.Dropzone className='h-full' />
          <FileUpload.List className='h-full *:col-start-1 *:row-start-1'>
            {() => (
              <FileUpload.Item className='p-0'>
                <FileUpload.ItemPreview className='size-full' />
              </FileUpload.Item>
            )}
          </FileUpload.List>
        </FileUpload>
      </div>
    )
    const img = await screen.findByRole('presentation')
    await waitFor(() => expect(img).toHaveProperty('complete', true))
    const slot = document.querySelector('[data-slot=file-upload]')!
    settle(slot)
    const outer = slot.getBoundingClientRect()
    const box = img.getBoundingClientRect()
    expect(outer.height).toBe(150)
    expect(box.top).toBeGreaterThanOrEqual(outer.top)
    expect(box.bottom).toBeLessThanOrEqual(outer.bottom)
    expect(box.right).toBeLessThanOrEqual(outer.right)
    expect(box.height).toBeGreaterThan(140)
  })

  it('revokes the preview URL once a removed row has gone', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    onTestFinished(() => revoke.mockRestore())
    render(<FileUpload defaultValue={[await png('poster.png')]} />)
    const src = (await screen.findByRole('presentation')).getAttribute('src')
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove poster.png' })
    )
    expect(revoke).not.toHaveBeenCalledWith(src)
    settle(screen.getByRole('listitem', { hidden: true }))
    // React runs an unmounted row's clean-up after the frame that removed it.
    await waitFor(() => expect(revoke).toHaveBeenCalledWith(src))
  })

  it('revokes the preview URL when the field unmounts', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    onTestFinished(() => revoke.mockRestore())
    const { unmount } = render(
      <FileUpload defaultValue={[await png('poster.png')]} />
    )
    const src = (await screen.findByRole('presentation')).getAttribute('src')
    unmount()
    expect(revoke).toHaveBeenCalledWith(src)
  })
})

describe('FileUpload with several files', () => {
  // After a drop the drag library covers the pointer until it moves.
  beforeEach(() => commands.pointer([{ type: 'move', x: 1, y: 1, steps: 2 }]))
  afterEach(releaseDragPointer)

  const centre = (element: Element) => {
    const box = element.getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  }
  const names = () =>
    screen
      .getAllByRole('listitem')
      .map(
        (row) =>
          row.querySelector('[data-slot=file-upload-item-name]')!.textContent
      )

  it('reorders a file by dragging its handle', async () => {
    const onValueChange = vi.fn()
    const files = ['rider.csv', 'stage.csv', 'runsheet.csv'].map(csv)
    render(
      <FileUpload
        maxFiles={6}
        defaultValue={files}
        onValueChange={onValueChange}
      />
    )
    // Let the rows pop in first, so they hold still under the pointer.
    settle(screen.getByRole('list'))
    const from = centre(
      screen.getByRole('button', { name: 'Reorder rider.csv' })
    )
    const target = screen.getAllByRole('listitem')[2]!.getBoundingClientRect()
    await commands.pointer([
      { type: 'move', ...from },
      { type: 'down' },
      { type: 'move', x: from.x, y: from.y + 6, steps: 3 },
      { type: 'move', x: from.x, y: from.y + 12, steps: 3 },
      {
        type: 'move',
        x: target.left + target.width / 2,
        y: target.top + target.height * 0.8,
        steps: 6
      },
      { type: 'up' }
    ])
    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith([
        files[1],
        files[2],
        files[0]
      ])
    )
    expect(names()).toEqual(['stage.csv', 'runsheet.csv', 'rider.csv'])
  })

  it('still collapses a removed row', async () => {
    render(
      <FileUpload maxFiles={6} defaultValue={[csv('a.csv'), csv('b.csv')]} />
    )
    const row = screen.getAllByRole('listitem')[0]!
    expect(getComputedStyle(row).transitionProperty).toContain(
      'grid-template-rows'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove a.csv' }))
    expect(row).toHaveAttribute('data-leaving')
    expect(row.getAnimations().length).toBeGreaterThan(0)
    settle(row)
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
  })

  it('counts only the rows staying in the Move menu while one collapses', async () => {
    render(
      <FileUpload
        maxFiles={6}
        defaultValue={['rider.csv', 'stage.csv', 'runsheet.csv'].map(csv)}
      />
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove runsheet.csv' })
    )
    // Still collapsing, so the count must already leave it out.
    hold(document.querySelector('li[data-leaving]')!)
    await userEvent.click(
      screen.getByRole('button', { name: 'Reorder stage.csv' })
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Move stage.csv down' })
    ).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('FileUpload pageDrop', () => {
  // An earlier test can leave a drag held over the page; a drop ends it.
  beforeEach(() => {
    document.body.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      })
    )
  })
  const pdf = (name: string) =>
    new File(['%PDF'], name, { type: 'application/pdf' })
  const overlay = () =>
    document.querySelector<HTMLElement>('[data-slot=file-upload-page-drop]')

  function Page({
    onValueChange
  }: {
    onValueChange?: (files: File[]) => void
  }) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <p data-testid='elsewhere' style={{ height: 120 }}>
          The rest of the page
        </p>
        <Field>
          <Field.Label>Event documents</Field.Label>
          <FileUpload
            pageDrop
            maxFiles={6}
            accept='image/*,application/pdf'
            onValueChange={onValueChange}
          />
        </Field>
      </div>
    )
  }

  it('names the field and the count while files are over the page, and takes the drop', async () => {
    const onValueChange = vi.fn()
    render(<Page onValueChange={onValueChange} />)
    const files = ['rider.pdf', 'stage.pdf', 'runsheet.pdf'].map(pdf)
    await dragFiles(screen.getByTestId('elsewhere'), files, false)
    await waitFor(() =>
      expect(overlay()).toHaveTextContent(
        'Drop to add 3 files to Event documents'
      )
    )
    expect(overlay()).not.toHaveAttribute('data-wrong')
    expect(overlay()).toHaveAttribute('aria-hidden')
    // Pointer-transparent, so the page under it still gets the drop.
    expect(getComputedStyle(overlay()!).pointerEvents).toBe('none')

    await dragFiles(screen.getByTestId('elsewhere'), files)
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(files))
    expect(overlay()).toBeNull()
  })

  it("turns danger when every file is a type the field won't take", async () => {
    render(<Page />)
    await dragFiles(
      screen.getByTestId('elsewhere'),
      [new File(['x'], 'notes.txt', { type: 'text/plain' })],
      false
    )
    await waitFor(() => expect(overlay()).toHaveAttribute('data-wrong'))
    expect(overlay()).toHaveTextContent(
      "Event documents doesn't take this file type"
    )
    expect(overlay()!.querySelector('.intent-danger')).not.toBeNull()
  })

  it('goes when the files leave the window', async () => {
    render(<Page />)
    const elsewhere = screen.getByTestId('elsewhere')
    await dragFiles(elsewhere, [pdf('rider.pdf')], false)
    await waitFor(() => expect(overlay()).not.toBeNull())
    elsewhere.dispatchEvent(
      new DragEvent('dragleave', { bubbles: true, relatedTarget: null })
    )
    await waitFor(() => expect(overlay()).toBeNull())
  })

  it('names the field without its required mark, and counts only the room left', async () => {
    render(
      <Field required>
        <Field.Label showIndicator>Event documents</Field.Label>
        <FileUpload
          pageDrop
          maxFiles={3}
          defaultValue={[pdf('rider.pdf'), pdf('stage.pdf')]}
        />
      </Field>
    )
    await dragFiles(document.body, [pdf('a.pdf'), pdf('b.pdf')], false)
    await waitFor(() =>
      expect(overlay()?.textContent).toBe(
        'Drop to add a file to Event documents'
      )
    )
  })

  it('turns danger when the field is full', async () => {
    render(
      <FileUpload
        pageDrop
        maxFiles={2}
        defaultValue={[pdf('a.pdf'), pdf('b.pdf')]}
      />
    )
    await dragFiles(document.body, [pdf('c.pdf')], false)
    await waitFor(() => expect(overlay()).toHaveAttribute('data-wrong'))
    expect(overlay()).toHaveTextContent('This field is full')
  })

  it('steps aside over the dropzone, which takes the drop itself', async () => {
    const onValueChange = vi.fn()
    render(<Page onValueChange={onValueChange} />)
    const zone = screen.getByRole('button', { name: /^Event documents Drop/ })
    const file = pdf('rider.pdf')
    await dragFiles(zone, [file], false)
    await waitFor(() => expect(zone).toHaveAttribute('data-dragging'))
    expect(overlay()).toBeNull()
    await dragFiles(zone, [file])
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1))
    expect(onValueChange).toHaveBeenCalledWith([file])
  })
})
