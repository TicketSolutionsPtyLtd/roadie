import type { ReactNode } from 'react'

import { Prose } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import {
  SPOT_ILLUSTRATIONS,
  type SpotIllustrationName
} from '../_shared/illustrations'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize,
  bySize,
  gapOf,
  ratioClass
} from '../_shared/surface'
import { useBlock } from '../_shared/useBlock'
import { type CallToActionPreset, callToActionDefinition } from './definition'

export type { CallToActionPreset } from './definition'

/** The panels a call to action's text and actions stay readable on, in light and dark mode. */
export type CallToActionEmphasis = BlockEmphasis | 'strong' | 'inverted'

// On a filled panel the copy takes the panel's text colour; marks, links and code
// lose fills and decorations that would vanish into it.
const FILLED_PARTS =
  '[&_mark]:bg-transparent [&_mark]:text-inherit [&_mark]:underline [&_mark]:decoration-2 [&_a]:decoration-current [&_code]:bg-transparent [&_code]:text-inherit'

const FILLED_TEXT: Partial<Record<CallToActionEmphasis, string>> = {
  strong: `[--intent-text-strong:var(--intent-text-on-strong)] [--intent-text-normal:var(--intent-text-on-strong)] [--intent-text-subtle:var(--intent-text-on-strong)] ${FILLED_PARTS}`,
  inverted: `[--intent-text-strong:var(--intent-text-inverted)] [--intent-text-normal:var(--intent-text-inverted)] [--intent-text-subtle:var(--intent-text-inverted)] ${FILLED_PARTS}`
}

export type CallToActionProps = {
  /**
   * `photo` sets the pitch on a panel beside a tilted photo that breaks out of its top, and `centred` centres it on the panel, with no photo.
   * @default 'photo'
   */
  preset?: CallToActionPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section heading. */
  title: string
  /** Words in the title to mark, such as `partnership`. */
  highlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** A paragraph or two of rich text, set in `Prose`. */
  body?: ReactNode
  /** The links to act on. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The photo beside the pitch on `photo`, breaking out of the panel's top, cropped to portrait (9:16). */
  image?: BlockImage
  /**
   * Turns `photo`'s photo a few degrees, as if pinned to the page. `false` sets it straight.
   * @default true
   */
  tilted?: boolean
  /**
   * The spot illustration at `photo`'s photo corner.
   * @default 'HighFive'
   */
  illustration?: SpotIllustrationName
  /** The block's intent, for the panel's tint and the highlighted words. */
  intent?: BlockIntent
  /**
   * The panel's surface. On `strong` and `inverted`, the strong action takes an intent that stands apart from the panel.
   * @default 'raised'
   */
  emphasis?: CallToActionEmphasis
  /** Draws the panel inside the page's padding, rounded at every width, instead of as a full-width band. */
  contained?: boolean
  /**
   * Where the heading, copy, and actions line up: `start` on `photo`, `center` on `centred`.
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller, with tighter spacing and smaller body text.
   * @default 'lg'
   */
  size?: BlockSize
}

/** Closes a page with a short pitch and the next step to take. */
export function CallToAction(props: CallToActionProps) {
  const { body, tilted = true, illustration = 'HighFive', size } = props
  const block = useBlock(callToActionDefinition, props)
  const image = block.name === 'photo' ? props.image : undefined
  const { emphasis } = block
  const centred = block.align === 'center'
  const Illustration = SPOT_ILLUSTRATIONS[illustration]

  return (
    <BlockRoot {...block.root}>
      <div className={cn(image && 'pt-14 @xl:pt-28 @7xl:pt-36')}>
        <BlockSurface
          emphasis={emphasis}
          contained={block.contained}
          className={cn('grid grid-cols-1', gapOf(size, 'loose'))}
        >
          {image && (
            <div
              className={cn(
                'relative -mt-24 w-1/3 max-w-78 @xl:absolute @xl:end-8 @xl:-top-24 @xl:mt-0 @xl:w-1/4 @3xl:end-16 @7xl:-top-32',
                tilted && '-rotate-5 @xl:rotate-5'
              )}
            >
              <div
                className={cn(
                  'overflow-hidden rounded-2xl border-4 border-(--color-neutral-light-0) shadow-lg',
                  ratioClass.portrait
                )}
              >
                <BlockImg
                  image={image}
                  sizes='(max-width: 768px) 33vw, 312px'
                  className='size-full object-cover'
                />
              </div>
              <Illustration
                outline
                className='absolute -end-12 -bottom-12 size-24 @7xl:-start-12 @7xl:end-auto'
              />
            </div>
          )}
          <div
            className={cn(
              'grid grid-cols-1',
              gapOf(size, 'loose'),
              image && [
                '@xl:max-w-7/12 content-center',
                // The photo beside the copy is out of flow, so the copy keeps the panel tall
                // enough for it: a quarter of the block wide at 9:16, less its overhang, plus
                // the illustration below it, less the panel's padding. Its rows pack at the
                // centre of that height, so short copy keeps its gaps.
                '@xl:min-h-[calc(min(44.5cqw,555px)-9rem)] @7xl:min-h-[calc(min(44.5cqw,555px)-11rem)]'
              ],
              centred && 'justify-items-center text-center'
            )}
          >
            <div
              className={cn(
                'grid min-w-0',
                gapOf(size, 'normal'),
                emphasis && FILLED_TEXT[emphasis]
              )}
            >
              <BlockHeading {...block.heading} />
              {body && (
                <Prose
                  size={bySize(size, { sm: 'md', md: 'md', lg: 'lg' })}
                  className='max-w-2xl text-pretty text-subtle [&>p:last-child]:font-medium'
                >
                  {body}
                </Prose>
              )}
            </div>
            <BlockActions
              {...block.actions}
              fill={
                emphasis === 'strong' || emphasis === 'inverted'
                  ? emphasis
                  : undefined
              }
            />
          </div>
        </BlockSurface>
      </div>
    </BlockRoot>
  )
}
