import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

export const metadata = {
  title: 'Elevation and layering',
  tokenFamily: 'elevation',
  description:
    'Intent-tinted shadows, inset shadows, rim light and the z-index scale.',
  category: 'Type, shape and depth',
  order: 3
}

export default function ElevationTokensPage() {
  return <TokenFamilyPage family='elevation' intentPicker />
}
