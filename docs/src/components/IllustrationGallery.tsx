'use client'

import { type ComponentType, Fragment, createElement } from 'react'

import { SPOT_ILLUSTRATION_NAMES } from '@/lib/spot-illustrations'

import { Code } from '@oztix/roadie-components'
import * as SpotIllustrations from '@oztix/roadie-illustrations/spot'

/** A component name that wraps only between its words, such as `BlockZigzag│Vertical│Right`. */
function WrappingName({ name }: { name: string }) {
  const words = name.split(/(?=[A-Z])/)
  return words.map((word, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {word}
    </Fragment>
  ))
}

export function IllustrationGallery() {
  return (
    <div
      data-not-prose
      data-slot='illustration-gallery'
      className='grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-4'
    >
      {SPOT_ILLUSTRATION_NAMES.map((name) => (
        <div
          key={name}
          className='grid content-start justify-items-center gap-1'
        >
          {createElement(
            SpotIllustrations[
              name as keyof typeof SpotIllustrations
            ] as ComponentType
          )}
          <Code emphasis='subtler' className='text-center'>
            <WrappingName name={name} />
          </Code>
        </div>
      ))}
    </div>
  )
}
