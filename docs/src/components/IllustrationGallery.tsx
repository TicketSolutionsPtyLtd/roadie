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
    <div className="flex flex-row gap-4 flex-wrap mb-8">
      {illustrations.map(([name, Component]) => (
        <div key={name} className="flex flex-col gap-1 items-center w-24">
          {createElement(Component as React.ComponentType)}
          <Code emphasis="subtler">{name}</Code>
        </div>
      ))}
    </div>
  )
}
