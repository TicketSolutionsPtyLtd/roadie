// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { check, layersOf, styleWarnings } from './check.ts'
import type { Layer } from './format.ts'
import { sources } from './generate.ts'

const FACE =
  '<path id="Face" fill="#e1d1fb" fill-rule="evenodd" d="M4 4h30v30H4z"/>'
const SHADOW =
  '<path id="Shadow" fill="#0091eb" fill-rule="evenodd" d="M6 6h30v30H6z"/>'
const STROKE =
  '<path id="Stroke" stroke="#1a1f2b" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round" d="M4 4h30v30H4z"/>'
const svg = (...children: string[]) =>
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48">${children.join('')}</svg>`

describe('check', () => {
  it('passes a source in the format', () => {
    expect(check(svg(SHADOW, FACE, STROKE), 'square.svg')).toEqual([])
  })

  it.each([
    [
      "a name that isn't kebab-case",
      svg(FACE, STROKE),
      'Map Pin.svg',
      'kebab-case'
    ],
    [
      'a name starting with a digit, which no component can take',
      svg(FACE, STROKE),
      '3d-glasses.svg',
      'start it with a letter'
    ],
    [
      "path data that doesn't parse",
      svg(FACE.replace('M4 4h30v30H4z', "M4 4h30v30H4z'"), STROKE),
      'a.svg',
      "Face's path data doesn't parse"
    ],
    [
      'a different box',
      svg(FACE, STROKE).replace('0 0 48 48', '0 0 24 24'),
      'a.svg',
      'the <svg> takes only'
    ],
    ['a group', svg(`<g>${FACE}</g>`, STROKE), 'a.svg', 'groups'],
    [
      'an unnamed layer',
      svg(FACE.replace(' id="Face"', ''), STROKE),
      'a.svg',
      "a path with no id isn't a layer"
    ],
    [
      "a layer that isn't in the format",
      svg(FACE.replace('"Face"', '"Vector"'), STROKE),
      'a.svg',
      "Vector isn't a layer"
    ],
    [
      'a drawn outline',
      svg('<path id="Outline" fill="#fff" d="M0 0h48v48H0z"/>', FACE, STROKE),
      'a.svg',
      'remove the Outline layer'
    ],
    [
      "a layer in another layer's colour",
      svg(FACE.replace('#e1d1fb', '#0091eb'), STROKE),
      'a.svg',
      'Face takes only fill="#e1d1fb"'
    ],
    [
      'a fill without even-odd',
      svg(FACE.replace(' fill-rule="evenodd"', ''), STROKE),
      'a.svg',
      'Face takes only'
    ],
    [
      'a heavier stroke',
      svg(FACE, STROKE.replace('.5', '1')),
      'a.svg',
      'Stroke takes only'
    ],
    [
      'a layer twice',
      svg(FACE, FACE, STROKE),
      'a.svg',
      'Face appears more than once'
    ],
    ['no Stroke', svg(FACE), 'a.svg', "there's no Stroke layer"],
    [
      'Stroke before a fill',
      svg(STROKE, FACE),
      'a.svg',
      'Stroke has to be the last layer'
    ],
    [
      'art too close to the edge',
      svg(FACE.replace('M4 4h30', 'M1 4h33'), STROKE),
      'a.svg',
      'keep it 2 inside'
    ]
  ])('flags %s', (_, source, file, message) => {
    expect(check(source, file).join('\n')).toContain(message)
  })
})

describe('styleWarnings', () => {
  const layer = (name: Layer['name'], d: string): Layer => ({ name, d })
  const square = (x: number, y: number, size: number) =>
    `M${x} ${y}h${size}v${size}h${-size}z`
  // A block drawn as the set draws one: 2 to 46, its Shadow below and right, outlined.
  const block = (shadow = square(8, 8, 38), face = square(2, 2, 38)) => [
    layer('Shadow', shadow),
    layer('Face', face),
    layer('Stroke', `${face}${shadow}`)
  ]
  const rules = (layers: Layer[], name?: string) =>
    styleWarnings(layers, name).map((w) => w.rule)

  it.each([
    [
      'coverage',
      'art too small to hold its own',
      [
        layer('Face', square(2, 2, 44)),
        layer('Shadow', square(20, 20, 6)),
        layer('Stroke', 'M2 2h44')
      ]
    ],
    [
      'long-side',
      'art short of the full 44',
      block(square(8, 8, 34), square(2, 2, 34))
    ],
    ['shadow-share', 'no Shadow showing', block(square(2, 2, 38))],
    [
      'stroke-share',
      'line work too dense for 48px',
      [
        ...block().slice(0, 2),
        layer(
          'Stroke',
          Array.from({ length: 40 }, (_, i) => `M3 ${3 + i}h36`).join('')
        )
      ]
    ],
    [
      'shadow-direction',
      'a shadow up and to the left',
      block(square(2, 2, 38), square(8, 8, 38))
    ],
    [
      'commands',
      'a curve sampled into points',
      [
        ...block().slice(0, 2),
        layer(
          'Stroke',
          `M2 2${Array.from({ length: 420 }, (_, i) => `L${2 + i / 10} 2`).join('')}`
        )
      ]
    ]
  ])('warns about %s: %s', (rule, _, layers) => {
    expect(rules(layers)).toContain(rule)
  })

  it('stays quiet about a rule an illustration breaks on purpose', () => {
    const upLeft = block(square(2, 2, 38), square(8, 8, 38))
    expect(rules(upLeft, 'flower-spiral')).not.toContain('shadow-direction')
  })

  it.each(sources().map((s) => [s.slug, s.svg]))(
    'finds nothing to flag in %s',
    (slug, svg) => {
      expect(styleWarnings(layersOf(svg), slug)).toEqual([])
    }
  )
})
