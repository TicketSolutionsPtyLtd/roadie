import type { Metadata } from 'next'

import { ExampleFrame } from '@/components/ExampleFrame'

export const metadata: Metadata = {
  title: 'Example frame | Roadie Design System',
  robots: { index: false }
}

export default function ExampleFramePage() {
  return <ExampleFrame />
}
