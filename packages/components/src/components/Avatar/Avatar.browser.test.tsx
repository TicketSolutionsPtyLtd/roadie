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

  it('sizes the group count text with its box', () => {
    render(<Avatar.GroupCount size='xl' count={12} />)
    const text = slot('avatar-group-count').firstElementChild!
    expect(fontSize(text)).toBeCloseTo(56 * 0.32, 0)
  })
})
