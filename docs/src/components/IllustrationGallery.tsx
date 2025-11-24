'use client'

import { createElement } from 'react'

import { Code, View } from '@oztix/roadie-components'
import * as SpotIllustrations from '@oztix/roadie-components/spot-illustrations'

export function IllustrationGallery() {
  // Get all exported illustrations from the spot-illustrations path
  const illustrations = Object.entries(SpotIllustrations)
    .filter(([name]) => {
      // Filter out utilities and type exports
      return (
        !name.includes('Props') &&
        name !== 'SpotIllustration' &&
        name !== 'createSpotIllustration' &&
        name !== 'SpotIllustrationComponentProps'
      )
    })
    .sort(([a], [b]) => a.localeCompare(b))

  return (
    <View flexDirection='row' gap='300' flexWrap='wrap' mb='400'>
      {illustrations.map(([name, Component]) => (
        <View key={name} gap='100' alignItems='center' width='96'>
          {createElement(Component as any)}
          <Code fontSize='xs' emphasis='subtler'>
            {name}
          </Code>
        </View>
      ))}
    </View>
  )
}
