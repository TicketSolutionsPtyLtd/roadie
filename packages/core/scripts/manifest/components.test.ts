import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  checkPartProps,
  componentFiles,
  createDocgenParser,
  formatType,
  isOurs,
  readFileComponents,
  splitDeprecation
} from './components'
import { createProgram } from './exports'

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

describe('checkPartProps', () => {
  const pillDir = fileURLToPath(
    new URL('./fixtures/workspace/pkg/src/components/Pill/', import.meta.url)
  )
  const files = componentFiles(path.join(pillDir, 'index.tsx'))
  const program = createProgram(
    files,
    fileURLToPath(
      new URL('./fixtures/workspace/tsconfig.react.json', import.meta.url)
    )
  )
  const max = { name: 'max', type: 'number' }

  it.each([
    ['a part with props', { name: 'Pill.Dot', props: [max] }],
    ['a part with no props type', { name: 'Pill.Frame', props: [] }]
  ])('passes %s', (_, part) => {
    expect(() => checkPartProps([part], program, files)).not.toThrow()
  })

  it('fails when a part leaves out a prop its props type declares', () => {
    expect(() =>
      checkPartProps([{ name: 'Pill.Dot', props: [] }], program, files)
    ).toThrow('Pill.Dot leaves out max, which PillDotProps declares')
  })
})

describe('readFileComponents', () => {
  // A component file beside a stand-in for a dependency's types.
  function readDots(source: string[], names = ['Dot']) {
    const dir = mkdtempSync(path.join(tmpdir(), 'dots-'))
    onTestFinished(() => rmSync(dir, { recursive: true }))
    const dependency = path.join(dir, 'node_modules/@base-ui/react')
    mkdirSync(dependency, { recursive: true })
    mkdirSync(path.join(dir, 'components'))
    writeFileSync(
      path.join(dependency, 'index.d.ts'),
      [
        "export interface DomAttributes { 'aria-label'?: string | undefined }",
        'export interface ButtonProps {',
        '  /**',
        '   * Renders a button element.',
        '   * @default true',
        '   */',
        '  native?: boolean | undefined',
        '}',
        'export interface TriggerProps {',
        '  /**',
        '   * Renders a native button element.',
        '   * @default true',
        '   */',
        '  native?: boolean',
        '}'
      ].join('\n')
    )
    const file = path.join(dir, 'components/Dot.tsx')
    writeFileSync(
      file,
      [
        "import type { ButtonProps, DomAttributes, TriggerProps } from '@base-ui/react'",
        ...source
      ].join('\n')
    )
    const program = createProgram(
      [file],
      fileURLToPath(
        new URL('./fixtures/workspace/tsconfig.react.json', import.meta.url)
      )
    )
    return readFileComponents(
      createDocgenParser(program),
      program,
      [file],
      new Set(names)
    )
  }

  it("names an export from its own displayName, not a helper's", () => {
    const parts = readDots(
      [
        '/** The first dot to draw. */',
        'export function firstDot(count: number) {',
        '  return count',
        '}',
        'export type MarkerProps = {',
        '  /** The most dots to draw. */',
        '  max?: number',
        '}',
        'export function Marker(props: MarkerProps) {',
        '  return firstDot(props.max ?? 0)',
        '}',
        "Marker.displayName = 'Pill.Dot'"
      ],
      ['Pill.Dot']
    )
    expect(parts).toEqual([
      {
        name: 'Pill.Dot',
        props: [
          { name: 'max', type: 'number', description: 'The most dots to draw.' }
        ]
      }
    ])
  })

  it("keeps a prop the component's type redeclares over a dependency's", () => {
    const [dot] = readDots([
      'export function Plain(props: DomAttributes) {',
      "  return props['aria-label']",
      '}',
      'export type DotProps = DomAttributes & {',
      '  /** Names the dot. */',
      "  'aria-label'?: string",
      '}',
      'export function Dot(props: DotProps) {',
      "  return props['aria-label']",
      '}'
    ])
    expect(dot?.props).toEqual([
      { name: 'aria-label', type: 'string', description: 'Names the dot.' }
    ])
  })

  it("takes a prop two dependency types declare from the first one's docs", () => {
    const [dot] = readDots([
      'export function Dot(props: ButtonProps & TriggerProps) {',
      '  return props.native',
      '}'
    ])
    expect(dot?.props).toEqual([
      {
        name: 'native',
        type: 'boolean',
        default: 'true',
        description: 'Renders a button element.',
        from: 'ButtonProps'
      }
    ])
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
