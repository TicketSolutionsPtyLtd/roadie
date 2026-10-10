import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'
import { durationToken, easingToken } from './motionTokens'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())

describe('motion tokens in JavaScript', () => {
  it('reads core’s durations and easing', () => {
    expect(durationToken(document.body, 'moderate')).toBe(200)
    expect(durationToken(document.body, 'slow')).toBe(300)
    expect(easingToken(document.body, 'enter')).toBe(
      'cubic-bezier(0, 0, 0.2, 1)'
    )
  })

  it('follows a token a theme overrides', () => {
    const themed = document.createElement('div')
    themed.style.setProperty('--duration-slow', '0.45s')
    themed.style.setProperty('--ease-enter', 'linear')
    document.body.append(themed)
    expect(durationToken(themed, 'slow')).toBe(450)
    expect(easingToken(themed, 'enter')).toBe('linear')
    themed.remove()
  })
})
