import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { server } from 'vitest/browser'

import { scenarios, setUpCheckPage, showScenario, widths } from './testUtils'

setUpCheckPage()

// Base UI exposes its focus guards to VoiceOver as buttons with no name, so
// a11y checks accept them there (docs/decisions/0012-base-ui-focus-guards.md).
// When this fails, Base UI has changed the guards: drop the exception.
const isAppleWebKit =
  server.browser === 'webkit' && /^(Mac|iP)/.test(navigator.platform)

const openPopups = scenarios.filter(({ name }) =>
  ['date-picker-open', 'dashboard-period-open'].includes(name)
)

describe.each(widths)('Base UI focus guards on a $name', (viewport) => {
  it.each(openPopups)(
    'are nameless buttons around $name only in WebKit on Apple platforms',
    async (scenario) => {
      await showScenario(scenario, 'light', viewport)
      const guards = [
        ...document.querySelectorAll<HTMLElement>('[data-base-ui-focus-guard]')
      ]
      const namelessButtons = screen.queryAllByRole('button', { name: '' })

      expect(guards.length).toBeGreaterThan(0)
      expect(guards.filter((guard) => namelessButtons.includes(guard))).toEqual(
        isAppleWebKit ? guards : []
      )
    }
  )
})
