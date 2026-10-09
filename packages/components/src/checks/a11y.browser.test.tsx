import { describe, it } from 'vitest'

import {
  expectApcaContrast,
  expectNoSeriousViolations,
  scenarios,
  setUpCheckPage,
  showScenario,
  themes,
  widths
} from './testUtils'

setUpCheckPage()

describe.each(widths)('Accessibility on a $name', (viewport) => {
  describe.each(themes)('in %s mode', (theme) => {
    it.each(scenarios)(
      '$name has no serious axe violations',
      async (scenario) => {
        await showScenario(scenario, theme, viewport)
        await expectNoSeriousViolations()
      }
    )
    it.each(scenarios)('$name meets APCA contrast', async (scenario) => {
      await showScenario(scenario, theme, viewport)
      expectApcaContrast()
    })
  })
})
