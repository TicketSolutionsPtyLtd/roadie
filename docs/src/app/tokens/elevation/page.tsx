import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Elevation and layering',
  description:
    'Intent-tinted shadows, inset shadows, rim light and the z-index scale.',
  category: 'Type, shape and depth',
  order: 3
}

export default function ElevationTokensPage() {
  return (
    <TokenFamilyPage
      family='elevation'
      intentPicker
      intro={
        <>
          Shadows take their tint from <Code>--intent-hue</Code>, so a danger
          surface casts a warm shadow. Stack overlays with the named{' '}
          <Code>z-*</Code> tiers, never a raw number.
        </>
      }
    />
  )
}
