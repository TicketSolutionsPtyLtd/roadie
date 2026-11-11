/** What a spot illustration is made of. Change these, change every illustration. */

export const BOX = 48

/** A source's name: kebab-case, starting with a letter, so it makes a component name. */
export const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

export function assertName(name: string) {
  if (!NAME.test(name))
    throw new Error(
      'use a kebab-case name that starts with a letter, such as map-pin'
    )
}

/** How far the outline reaches past the art, so the art has to stay this far inside the box. */
export const OUTLINE_WIDTH = 2

/** The fill layers, by name, with the colour each is drawn in. */
export const FILL_LAYERS = {
  Shadow: '#0091eb',
  Face: '#e1d1fb',
  Detail: '#ffc3a8',
  Highlight: '#c2dffb'
} as const

export type FillLayer = keyof typeof FILL_LAYERS

export const STROKE = { colour: '#1a1f2b', width: 0.5 } as const

/** The sticker's cut line. It's generated from the art, so a source never draws it. */
export const OUTLINE_COLOUR = '#ffffff'

export type Layer = { name: FillLayer | 'Stroke'; d: string }
