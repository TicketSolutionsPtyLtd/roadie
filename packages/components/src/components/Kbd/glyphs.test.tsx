import type { ComponentType, SVGProps } from 'react'

import type { Icon } from '@phosphor-icons/react'
import {
  ArrowDownIcon,
  ArrowFatUpIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BackspaceIcon,
  CommandIcon,
  ControlIcon,
  KeyReturnIcon,
  OptionIcon
} from '@phosphor-icons/react/ssr'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import * as glyphs from './glyphs'

const PHOSPHOR: Record<keyof typeof glyphs, Icon> = {
  ArrowDownGlyph: ArrowDownIcon,
  ArrowFatUpGlyph: ArrowFatUpIcon,
  ArrowLeftGlyph: ArrowLeftIcon,
  ArrowRightGlyph: ArrowRightIcon,
  ArrowUpGlyph: ArrowUpIcon,
  BackspaceGlyph: BackspaceIcon,
  CommandGlyph: CommandIcon,
  ControlGlyph: ControlIcon,
  KeyReturnGlyph: KeyReturnIcon,
  OptionGlyph: OptionIcon
}

const cases = Object.entries(PHOSPHOR).map(
  ([name, icon]) =>
    [
      name,
      glyphs[name as keyof typeof glyphs] as ComponentType<
        SVGProps<SVGSVGElement>
      >,
      icon
    ] as const
)

describe('Kbd glyphs', () => {
  it('draws exactly the ten glyphs Kbd uses', () => {
    expect(cases).toHaveLength(10)
  })

  it.each(cases)(
    '%s renders the same SVG as Phosphor bold',
    (_, Glyph, PhosphorIcon) => {
      const ours = renderToStaticMarkup(
        <Glyph aria-hidden='true' className='size-3' />
      )
      const theirs = renderToStaticMarkup(
        <PhosphorIcon weight='bold' aria-hidden='true' className='size-3' />
      )
      expect(ours).toBe(theirs)
    }
  )
})
