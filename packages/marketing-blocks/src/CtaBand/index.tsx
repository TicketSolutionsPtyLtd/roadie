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
import { type CtaBandPreset, ctaBand } from './definition'

export type { CtaBandPreset } from './definition'

export type CtaBandProps = {
  /**
   * `studio-cta` sets the pitch beside a tilted photo; `talk-to-us` centres it with no photo.
   * @default 'studio-cta'
   */
  preset?: CtaBandPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** The section's `id`, for linking to it. */
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
  actions: BlockAction[]
  /** The photo beside the pitch, in `studio-cta` only. Portrait, about 2:3. */
  image?: BlockImage
}

/** Closes a page with a short pitch and the next step to take. */
export function CtaBand({
  preset: presetName,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  body,
  actions,
  image
}: CtaBandProps) {
  const headingId = useId()
  const preset = presetOf(ctaBand, presetName)
  const split = preset.variant === 'split'
  const photo = split ? image : undefined

  return (
    <BlockRoot
      block={ctaBand.name}
      variant={preset.variant}
      preset={preset.name}
      position={position}
      id={id}
      aria-labelledby={headingId}
      className='py-24 lg:py-32 xl:px-2'
    >
      <div className='relative container-8xl grid gap-12 bg-raised py-12 md:py-16 xl:rounded-3xl'>
        {photo && (
          <div className='relative -mt-24 w-2/5 max-w-95 -rotate-5 md:absolute md:end-16 md:-top-1/3 md:mt-0 md:w-1/3 md:rotate-5 xl:-top-1/2'>
            <div className='aspect-380/555 overflow-hidden rounded-2xl border-4 border-(--color-neutral-light-0) shadow-lg'>
              <BlockImg
                image={photo}
                sizes='(max-width: 768px) 40vw, 380px'
                className='size-full object-cover'
              />
            </div>
            <HighFive
              outline
              className='absolute -end-12 -bottom-12 size-24 xl:-start-12 xl:end-auto'
            />
          </div>
        )}
        <div
          className={cn(
            'grid gap-12',
            split ? 'md:max-w-7/12' : 'justify-items-center text-center'
          )}
        >
          <div className='grid gap-8'>
            <BlockHeading
              id={headingId}
              eyebrow={eyebrow}
              title={title}
              titleHighlight={titleHighlight}
              description={description}
              align={split ? 'start' : 'center'}
            />
            {body && (
              <Prose size='lg' className='max-w-2xl text-pretty'>
                {body}
              </Prose>
            )}
          </div>
          <BlockActions
            actions={actions}
            className={split ? undefined : 'justify-center'}
          />
        </div>
      </div>
    </BlockRoot>
  )
}
