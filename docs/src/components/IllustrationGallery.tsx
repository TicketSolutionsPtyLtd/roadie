'use client'

import { createElement } from 'react'

import { Code } from '@oztix/roadie-components'
import * as SpotIllustrations from '@oztix/roadie-components/spot-illustrations'

export function IllustrationGallery() {
  const illustrations = Object.entries(SpotIllustrations)
    .filter(([name]) => {
      return (
        !name.includes('Props') &&
        name !== 'SpotIllustration' &&
        name !== 'createSpotIllustration' &&
        name !== 'SpotIllustrationComponentProps'
      )
    })
    .sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className='mb-8 flex flex-wrap gap-4'>
      {illustrations.map(([name, Component]) => (
        <div key={name} className='grid w-24 justify-items-center gap-1'>
          {createElement(Component as React.ComponentType)}
          <Code emphasis='subtler'>{name}</Code>
        </div>
      ))}
    </div>
  )
}
