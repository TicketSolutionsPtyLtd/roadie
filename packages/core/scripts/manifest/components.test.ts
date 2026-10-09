import { formatType, splitDeprecation } from './components'

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
