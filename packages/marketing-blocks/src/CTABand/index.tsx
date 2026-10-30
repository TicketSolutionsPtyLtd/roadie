import { type ReactNode, useId } from 'react'

import { Prose } from '@oztix/roadie-components/prose'
import { HighFive } from '@oztix/roadie-components/spot-illustrations'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import {
  type BlockEmphasis,
  type BlockIntent,
  emphasisClass
} from '../_shared/surface'
import { type CTABandPreset, ctaBandDefinition } from './definition'

export type { CTABandPreset } from './definition'

/** The panels a CTA band's text and actions stay readable on, in light and dark mode. */
export type CTABandEmphasis = Extract<
  BlockEmphasis,
  'raised' | 'subtle' | 'strong' | 'inverted'
>

// On a filled panel the copy takes the panel's text colour; marks, links and code
// lose fills and decorations that would vanish into it.
const FILLED_PARTS =
  '[&_mark]:bg-transparent [&_mark]:text-inherit [&_mark]:underline [&_mark]:decoration-2 [&_a]:decoration-current [&_code]:bg-transparent [&_code]:text-inherit'

const FILLED_TEXT: Partial<Record<CTABandEmphasis, string>> = {
  strong: `[--intent-text-strong:var(--intent-text-on-strong)] [--intent-text-normal:var(--intent-text-on-strong)] [--intent-text-subtle:var(--intent-text-on-strong)] ${FILLED_PARTS}`,
  inverted: `[--intent-text-strong:var(--intent-text-inverted)] [--intent-text-normal:var(--intent-text-inverted)] [--intent-text-subtle:var(--intent-text-inverted)] ${FILLED_PARTS}`
}

export type CTABandProps = {
  /**
   * `with-photo` sets the pitch beside a tilted photo; `centred` centres it with no photo.
   * @default 'with-photo'
   */
  preset?: CTABandPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section heading. */
  title: string
  /** Words in the title to mark, such as `partnership`. */
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** A paragraph or two of rich text, set in `Prose`. */
  body?: ReactNode
  /** The links to act on. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The photo beside the pitch, in `with-photo` only. Portrait, about 2:3. */
  image?: BlockImage
  /** The block's intent, for the panel's tint and the highlighted words. */
  intent?: BlockIntent
  /**
   * The panel's surface. On `strong` and `inverted`, the strong action takes an intent that stands apart from the panel.
   * @default 'raised'
   */
  emphasis?: CTABandEmphasis
}

/** Closes a page with a short pitch and the next step to take. */
export function CTABand({
  preset: presetName,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  body,
  actions,
  image,
  intent,
  emphasis = 'raised'
}: CTABandProps) {
  const headingId = useId()
  const { name, variant } = presetOf(ctaBandDefinition, presetName)
  const split = variant === 'split'
  const photo = split ? image : undefined

  return (
    <BlockRoot
      block={ctaBandDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={headingId}
      intent={intent}
    >
      <div className='@7xl:px-2'>
        <div
          data-slot='cta-band-panel'
          className={cn(
            'relative container-8xl grid grid-cols-1 gap-12 py-12 @xl:py-16 @7xl:rounded-3xl',
            emphasisClass(emphasis),
            photo && 'mt-14 @xl:mt-28 @7xl:mt-36'
          )}
        >
          {photo && (
            <div className='relative -mt-24 w-2/5 max-w-95 -rotate-5 @xl:absolute @xl:end-8 @xl:-top-24 @xl:mt-0 @xl:w-1/3 @xl:rotate-5 @3xl:end-16 @7xl:-top-32'>
              <div className='aspect-380/555 overflow-hidden rounded-2xl border-4 border-(--color-neutral-light-0) shadow-lg'>
                <BlockImg
                  image={photo}
                  sizes='(max-width: 768px) 40vw, 380px'
                  className='size-full object-cover'
                />
              </div>
              <HighFive
                outline
                className='absolute -end-12 -bottom-12 size-24 @7xl:-start-12 @7xl:end-auto'
              />
            </div>
          )}
          <div
            className={cn(
              'grid grid-cols-1 gap-12',
              split ? '@xl:max-w-7/12' : 'justify-items-center text-center'
            )}
          >
            <div className={cn('grid min-w-0 gap-8', FILLED_TEXT[emphasis])}>
              <BlockHeading
                id={headingId}
                eyebrow={eyebrow}
                title={title}
                titleHighlight={titleHighlight}
                description={description}
                align={split ? 'start' : 'center'}
                intent={intent}
              />
              {body && (
                <Prose
                  size='lg'
                  className='max-w-2xl text-pretty text-subtle [&>p:last-child]:font-medium'
                >
                  {body}
                </Prose>
              )}
            </div>
            <BlockActions
              actions={actions}
              intent={intent}
              fill={
                emphasis === 'strong' || emphasis === 'inverted'
                  ? emphasis
                  : undefined
              }
              className={split ? undefined : 'justify-center'}
            />
          </div>
        </div>
      </div>
    </BlockRoot>
  )
}
