import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import {
  scenarios,
  setUpCheckPage,
  showScenario,
  themes,
  widths
} from './testUtils'

setUpCheckPage()

describe.each(widths)('Appearance on a $name', (viewport) => {
  describe.each(themes)('in %s mode', (theme) => {
    it.each(scenarios)('$name matches its baseline', async (scenario) => {
      await showScenario(scenario, theme, viewport)
      await expect
        .element(page.elementLocator(document.body))
        .toMatchScreenshot(`${scenario.name}-${viewport.name}-${theme}`)
    })
  })
})
