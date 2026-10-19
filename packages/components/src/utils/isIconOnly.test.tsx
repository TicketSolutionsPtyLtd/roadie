import { describe, expect, it } from 'vitest'

import { isIconOnly } from './isIconOnly'

function Icon() {
  return <svg />
}

describe('isIconOnly', () => {
  it.each([
    ['an icon component', <Icon key='icon' />],
    ['a raw svg', <svg key='svg' />]
  ])('is true for %s', (_, child) => {
    expect(isIconOnly(child)).toBe(true)
  })

  it.each([
    ['text', 'Save'],
    ['a span', <span key='span'>Save</span>],
    ['a fragment of text', <>Save</>],
    [
      'a fragment holding an icon',
      <>
        <Icon />
      </>
    ],
    ['several children', [<Icon key='a' />, 'Save']]
  ])('is false for %s', (_, child) => {
    expect(isIconOnly(child)).toBe(false)
  })
})
