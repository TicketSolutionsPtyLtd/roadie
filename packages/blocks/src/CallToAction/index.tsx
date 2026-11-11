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
  type SpotIllustrationName,
  spotIllustration
} from '../_shared/illustrations'
import { isOwnKey } from '../_shared/ownKey'
import { presetOf } from '../_shared/presets'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockRatio,
  type BlockSize,
  bySize,
  gapOf,
  ratioClass
} from '../_shared/surface'
import { useBlock } from '../_shared/useBlock'
import { type CallToActionPreset, callToActionDefinition } from './definition'

export type { CallToActionPreset } from './definition'

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
  /** The photo beside the pitch on `photo`, breaking out of the panel's top, cropped to its `ratio`. */
  image?: BlockImage
  /**
   * The photo's shape on `photo`.
   * @default 'portrait'
   */
  ratio?: BlockRatio
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
  emphasis?: BlockEmphasis
  /** Draws the surface as a rounded panel within the page's frame, in line with the hero, instead of a band across the window. */
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

// Literal class names, so Tailwind finds them. The photo is a quarter of the block, at most
// 312px wide; from @5xl a square, landscape, or banner photo grows to a third, at most 384px, and the
// copy narrows to half to make room. A story or portrait photo stays a quarter, or it would run too tall.
const PHOTO_WIDTH: Record<BlockRatio, string> = {
  story: 'w-1/3 max-w-78 @xl:w-1/4',
  portrait: 'w-1/3 max-w-78 @xl:w-1/4',
  square: 'w-1/3 max-w-78 @xl:w-1/4 @5xl:w-1/3 @5xl:max-w-96',
  landscape: 'w-1/3 max-w-78 @xl:w-1/4 @5xl:w-1/3 @5xl:max-w-96',
  banner: 'w-1/3 max-w-78 @xl:w-1/4 @5xl:w-1/3 @5xl:max-w-96'
}

const COPY_WIDTH: Record<BlockRatio, string> = {
  story: '@xl:max-w-7/12',
  portrait: '@xl:max-w-7/12',
  square: '@xl:max-w-7/12 @5xl:max-w-1/2',
  landscape: '@xl:max-w-7/12 @5xl:max-w-1/2',
  banner: '@xl:max-w-7/12 @5xl:max-w-1/2'
}

// The photo's height at its width, so the copy keeps the panel tall enough for it.
const PHOTO_HEIGHT: Record<BlockRatio, string> = {
  portrait:
    '@xl:min-h-[calc(min(33.3cqw,416px)-9rem)] @7xl:min-h-[calc(min(33.3cqw,416px)-11rem)]',
  story:
    '@xl:min-h-[calc(min(44.5cqw,555px)-9rem)] @7xl:min-h-[calc(min(44.5cqw,555px)-11rem)]',
  square:
    '@xl:min-h-[calc(min(25cqw,312px)-9rem)] @5xl:min-h-[calc(min(33.3cqw,384px)-9rem)] @7xl:min-h-[calc(min(33.3cqw,384px)-11rem)]',
  landscape:
    '@xl:min-h-[calc(min(16.7cqw,208px)-9rem)] @5xl:min-h-[calc(min(22.2cqw,256px)-9rem)] @7xl:min-h-[calc(min(22.2cqw,256px)-11rem)]',
  banner:
    '@xl:min-h-[calc(min(12.5cqw,156px)-9rem)] @5xl:min-h-[calc(min(16.7cqw,192px)-9rem)] @7xl:min-h-[calc(min(16.7cqw,192px)-11rem)]'
}

/** Closes a page with a short pitch and the next step to take. */
export function CallToAction(props: CallToActionProps) {
  const { body, tilted = true, illustration = 'HighFive', size } = props
  const block = useBlock(callToActionDefinition, props)
  const image = block.name === 'photo' ? props.image : undefined
  const preset = presetOf(callToActionDefinition, block.name)
  const ratio = isOwnKey(PHOTO_WIDTH, props.ratio)
    ? props.ratio
    : 'ratio' in preset.defaults
      ? preset.defaults.ratio
      : 'portrait'
  const { emphasis } = block
  const centred = block.align === 'center'
  const Illustration = spotIllustration(illustration, 'HighFive')

  return (
    <BlockRoot {...block.root}>
      {/* Room for the photo's overhang, plus the corner its tilt lifts. */}
      <div className={cn(image && 'pt-14 @xl:pt-28 @5xl:pt-30 @7xl:pt-38')}>
        <BlockSurface
          emphasis={emphasis}
          contained={block.contained}
          className={cn('grid grid-cols-1', gapOf(size, 'loose'))}
        >
          {image && (
            <div
              className={cn(
                'relative -mt-24 @xl:absolute @xl:end-8 @xl:-top-24 @xl:mt-0 @3xl:end-16 @7xl:-top-32',
                PHOTO_WIDTH[ratio],
                tilted && '-rotate-5 @xl:rotate-5'
              )}
            >
              <div
                className={cn(
                  // The photo fills the frame inside its border absolutely: WebKit sizes a percentage height against the border box of an aspect-ratio frame.
                  'relative overflow-hidden rounded-2xl border-4 border-(--color-neutral-light-0) shadow-lg',
                  ratioClass[ratio]
                )}
              >
                <BlockImg
                  image={image}
                  sizes='(max-width: 768px) 33vw, 384px'
                  className='absolute inset-0 size-full object-cover'
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
                'content-center',
                COPY_WIDTH[ratio],
                // The photo beside the copy is out of flow, so the copy keeps the panel tall
                // enough for it: the photo's height at its width, less its overhang, plus the
                // illustration below it, less the panel's padding. Its rows
                // pack at the centre of that height, so short copy keeps its gaps.
                PHOTO_HEIGHT[ratio]
              ],
              centred && 'justify-items-center text-center'
            )}
          >
            <div className={cn('grid min-w-0', gapOf(size, 'normal'))}>
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
            <BlockActions {...block.actions} />
          </div>
        </BlockSurface>
      </div>
    </BlockRoot>
  )
}
