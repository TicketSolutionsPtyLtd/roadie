import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeDelays = useStylesheet(
    '.delayed, .delayed::before { content: ""; animation: fade-in 150ms 300ms both; transition: opacity 150ms 200ms; }'
  )
  removeStylesheets = () => {
    removeDelays()
    removeRoadie()
  }
})
afterAll(() => removeStylesheets())
afterEach(() => commands.reduceMotion(false))

function delays(pseudo?: '::before') {
  const element = document.createElement('div')
  element.className = 'delayed'
  document.body.append(element)
  const { animationDelay, transitionDelay } = getComputedStyle(element, pseudo)
  element.remove()
  return { animationDelay, transitionDelay }
}

describe('delays for someone who reduces motion', () => {
  it.each([undefined, '::before'] as const)(
    'start at once on the element%s',
    async (pseudo) => {
      await commands.reduceMotion(true)
      expect(delays(pseudo)).toEqual({
        animationDelay: '0s',
        transitionDelay: '0s'
      })
    }
  )

  it('start at once when set inline', async () => {
    await commands.reduceMotion(true)
    const element = document.createElement('div')
    element.style.animationDelay = '300ms'
    element.style.transitionDelay = '200ms'
    document.body.append(element)
    const { animationDelay, transitionDelay } = getComputedStyle(element)
    element.remove()
    expect({ animationDelay, transitionDelay }).toEqual({
      animationDelay: '0s',
      transitionDelay: '0s'
    })
  })
})

describe('delays for everyone else', () => {
  it.each([undefined, '::before'] as const)(
    'keep their length on the element%s',
    async (pseudo) => {
      await commands.reduceMotion(false)
      expect(delays(pseudo)).toEqual({
        animationDelay: '0.3s',
        transitionDelay: '0.2s'
      })
    }
  )
})
