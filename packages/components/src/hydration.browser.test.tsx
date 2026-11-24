import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { commands, page, server } from 'vitest/browser'

import roadieCss from '../vitest.browser.css?inline'
import { useStylesheet } from './components/Pane/testUtils'
import { type Fixture, hydrationShift } from './utils/hydrationTestUtils'

// One file per component, each export a fixture: a component with no props.
const files = import.meta.glob<Record<string, Fixture>>(
  './components/*/*.ssr.tsx',
  { eager: true }
)
const fixtures = Object.entries(files).flatMap(([file, exports]) =>
  Object.entries(exports).map(([name, Fixture]) => ({ file, name, Fixture }))
)

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})

// Chromium only: the fixtures were proven there, and Node words dates as it does.
describe.skipIf(server.browser !== 'chromium').each([390, 1280])(
  'hydrating at %ipx wide',
  (width) => {
    beforeAll(() => page.viewport(width, 900))

    it.each(fixtures)(
      'keeps $file $name where the server painted it',
      { timeout: 20_000 },
      async ({ file, name, Fixture }) => {
        const html = await commands.serverRender(file, name)
        const allowance = Fixture.allowance?.[width]
        expect(await hydrationShift(html, <Fixture />, allowance)).toEqual([])
      }
    )
  }
)
