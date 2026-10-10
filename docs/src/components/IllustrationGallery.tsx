'use client'

import { type ComponentType, createElement } from 'react'

import { SPOT_ILLUSTRATION_NAMES } from '@/lib/spot-illustrations'

import { Code } from '@oztix/roadie-components'
import * as SpotIllustrations from '@oztix/roadie-components/spot-illustrations'

export function IllustrationGallery() {
  return (
    <div data-not-prose className='flex flex-wrap gap-4'>
      {SPOT_ILLUSTRATION_NAMES.map((name) => (
        <div key={name} className='grid w-24 justify-items-center gap-1'>
          {createElement(
            SpotIllustrations[
              name as keyof typeof SpotIllustrations
            ] as ComponentType
          )}
          <Code emphasis='subtler'>{name}</Code>
        </div>
      ))}
    </div>
  )
}
