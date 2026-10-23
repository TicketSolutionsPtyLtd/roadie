import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = fileURLToPath(new URL('..', import.meta.url))

export const MISTAKES = `import { Heart, StarIcon } from '@phosphor-icons/react'
import { Card } from '@oztix/roadie-components/card'

export const Ticket = () => (
  <div className='dark:bg-strong z-[5] rounded-[10px] bg-[#ff0000]'>
    <Heart weight='bold' className='size-4' />
    <StarIcon size={16} />
    <Card><Card.Header>Midnight Frequency</Card.Header></Card>
  </div>
)
`

export const CLEAN = `import { HeartIcon } from '@phosphor-icons/react'
import { Card } from '@oztix/roadie-components/card'

export const Ticket = () => (
  <Card>
    <Card.Content>
      <HeartIcon weight='bold' className='size-4 rounded-xl z-popover' />
    </Card.Content>
  </Card>
)
`

export const MISTAKE_RULES = [
  'roadie/card-content',
  'roadie/no-arbitrary-radius',
  'roadie/no-arbitrary-z-index',
  'roadie/no-dark-variant',
  'roadie/no-hex-colour-class',
  'roadie/phosphor-icon-size-prop',
  'roadie/phosphor-icon-suffix',
  'roadie/phosphor-icon-weight'
]

// One of each jsdom mistake, in a jsdom test and in a browser test.
export const TEST_MISTAKES = `import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'

it('lays out the ticket on a phone', () => {
  const css = readFileSync('./ticket.css', 'utf8')
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375)
  expect(document.body).toHaveClass('md:grid')
  expect(css).toBeTruthy()
})
`

export const TEST_MISTAKE_RULES = [
  'roadie/no-css-class-in-jsdom',
  'roadie/no-css-source-in-jsdom',
  'roadie/no-layout-fake-in-jsdom'
]

// Packs the package as npm would publish it into a fresh app, with the
// fixtures in src/, so the app can reach only the published files and exports.
export function createApp(prefix, files) {
  const app = mkdtempSync(join(tmpdir(), prefix))
  const output = execFileSync(
    'pnpm',
    ['pack', '--pack-destination', app, '--json'],
    { cwd: packageDir, encoding: 'utf8' }
  )
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify({ name: 'consumer', private: true, type: 'module' })
  )
  mkdirSync(join(app, 'src'))
  const appFiles = {
    'src/Mistakes.jsx': MISTAKES,
    'src/Clean.jsx': CLEAN,
    'src/Ticket.test.jsx': TEST_MISTAKES,
    'src/Ticket.browser.test.jsx': TEST_MISTAKES
  }
  for (const [file, content] of Object.entries({ ...appFiles, ...files }))
    writeFileSync(join(app, file), content)
  return { app, packed: JSON.parse(output) }
}
