import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Avatar, type AvatarSize } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const slot = (name: string) =>
  document.querySelector<HTMLElement>(`[data-slot="${name}"]`)!

const width = (el: Element) => el.getBoundingClientRect().width
const fontSize = (el: Element) => parseFloat(getComputedStyle(el).fontSize)

const cases: {
  label: string
  size?: AvatarSize
  className?: string
  box: number
}[] = [
  { label: 'xs', size: 'xs', box: 24 },
  { label: 'md', size: 'md', box: 40 },
  { label: 'xl', size: 'xl', box: 56 },
  { label: 'custom size-20', className: 'size-20', box: 80 }
]

describe('Avatar scales its contents with the box', () => {
  for (const { label, size, className, box } of cases) {
    it(`sizes initials and the icon at ${label}`, () => {
      const { unmount } = render(
        <Avatar size={size} className={className} name='Mia Tran' />
      )
      expect(width(slot('avatar'))).toBeCloseTo(box, 0)
      expect(fontSize(slot('avatar-fallback'))).toBeCloseTo(box * 0.38, 0)
      unmount()

      render(<Avatar size={size} className={className} />)
      const fallback = slot('avatar-fallback')
      const icon = fallback.querySelector('svg')!
      // Half the fallback's content box, inside its hairline border.
      expect(width(icon)).toBeCloseTo(fallback.clientWidth / 2, 0)
      expect(fallback.clientWidth).toBeGreaterThan(box - 4)
    })
  }

  for (const [size, box] of [
    ['xs', 24],
    ['md', 40],
    ['xl', 56]
  ] as const) {
    it(`keeps a failed photo out of the layout at ${size}`, async () => {
      const { container } = render(
        <>
          <div id='plain'>
            <Avatar size={size} name='Ada Nguyen' />
          </div>
          <div id='failed'>
            <Avatar size={size} src='/missing-avatar.png' name='Ada Nguyen' />
          </div>
        </>
      )
      const part = (id: string, name: string) =>
        container.querySelector<HTMLElement>(`#${id} [data-slot="${name}"]`)!
      await expect
        .poll(() => part('failed', 'avatar-image').hasAttribute('data-error'))
        .toBe(true)

      for (const id of ['plain', 'failed']) {
        const root = part(id, 'avatar').getBoundingClientRect()
        const fallback = part(id, 'avatar-fallback')
        const rect = fallback.getBoundingClientRect()
        expect(root.width).toBeCloseTo(box, 0)
        expect(rect.width).toBeCloseTo(root.width, 0)
        expect(rect.height).toBeCloseTo(root.height, 0)
        expect(rect.left).toBeCloseTo(root.left, 0)
        expect(rect.top).toBeCloseTo(root.top, 0)
        expect(getComputedStyle(fallback).borderTopWidth).toBe('1px')
      }
      expect(fontSize(part('failed', 'avatar-fallback'))).toBe(
        fontSize(part('plain', 'avatar-fallback'))
      )
    })
  }

  it('shows a loaded photo over the whole box', async () => {
    render(
      <Avatar
        size='md'
        name='Ada Nguyen'
        src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
      />
    )
    await expect
      .poll(() => document.querySelector('[data-slot="avatar-fallback"]'))
      .toBeNull()
    const image = slot('avatar-image')
    expect(getComputedStyle(image).visibility).toBe('visible')
    const root = slot('avatar').getBoundingClientRect()
    const rect = image.getBoundingClientRect()
    expect(rect.width).toBeCloseTo(root.width, 0)
    expect(rect.height).toBeCloseTo(root.height, 0)
  })

  it('sizes the group count text with its box', () => {
    render(<Avatar.GroupCount size='xl' count={12} />)
    const text = slot('avatar-group-count').firstElementChild!
    expect(fontSize(text)).toBeCloseTo(56 * 0.32, 0)
  })
})
