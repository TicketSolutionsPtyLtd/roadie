import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  componentFiles,
  formatType,
  isOurs,
  splitDeprecation
} from './components'

describe('splitDeprecation', () => {
  it.each([
    ['Plain text.', undefined, { description: 'Plain text.' }],
    [
      'Old size.\n@deprecated Use `size`\ninstead.',
      undefined,
      { description: 'Old size.', deprecated: 'Use `size` instead.' }
    ],
    [
      'Before.\n@deprecated Gone.\n\nAfter.',
      undefined,
      { description: 'Before.\n\nAfter.', deprecated: 'Gone.' }
    ],
    [
      'Kept.',
      { deprecated: 'Use `render`.' },
      { description: 'Kept.', deprecated: 'Use `render`.' }
    ],
    ['', { deprecated: '' }, { description: '', deprecated: '' }],
    [
      'The legacy `as` prop is\n`@deprecated`. Use `render`.',
      undefined,
      { description: 'The legacy `as` prop is `@deprecated`. Use `render`.' }
    ]
  ])('splits %j', (description, tags, expected) => {
    expect(splitDeprecation(description, tags)).toEqual(expected)
  })
})

describe('formatType', () => {
  it.each([
    [
      { name: 'enum', value: [{ value: "'sm'" }, { value: "'md'" }] },
      '"sm" | "md"'
    ],
    [
      {
        name: 'enum',
        value: [{ value: '0' }, { value: '1' }, { value: 'true' }]
      },
      '0 | 1 | true'
    ],
    [
      { name: 'enum', value: [{ value: '"sm"' }, { value: 'null' }] },
      '"sm" | null'
    ],
    [{ name: 'string | undefined' }, 'string'],
    [{ name: 'boolean' }, 'boolean']
  ])('formats %j', (type, expected) => {
    expect(formatType(type)).toBe(expected)
  })
})

describe('isOurs', () => {
  it.each([
    'packages/components/src/components/Button/Button.tsx',
    'packages/blocks/src/Provider/index.tsx',
    'packages/editor/dist/Editor/index.d.ts'
  ])('keeps props declared in %s', (file) => {
    expect(isOurs(`/repo/${file}`)).toBe(true)
  })

  it('drops props declared in a dependency', () => {
    expect(isOurs('/repo/node_modules/@base-ui/react/button/Button.d.ts')).toBe(
      false
    )
  })
})

describe('componentFiles', () => {
  it("leaves out a folder's tests and hydration fixtures", () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'component-files-'))
    onTestFinished(() => rmSync(dir, { recursive: true }))
    for (const name of ['index.tsx', 'Grid.test.tsx', 'Grid.ssr.tsx'])
      writeFileSync(path.join(dir, name), '')
    const entry = path.join(dir, 'index.tsx')
    expect(componentFiles(entry)).toEqual([entry])
  })
})
