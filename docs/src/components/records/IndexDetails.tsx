import type { ReactNode } from 'react'

import { Accordion } from '@oztix/roadie-components/accordion'

/** An Accordion in page prose: it takes the flow gap above it, and prose's margin on `details` stays off its items. */
export function IndexDetails({ children }: { children: ReactNode }) {
  return (
    <Accordion data-slot='index-details' className='mt-(--prose-flow) *:mt-0'>
      {children}
    </Accordion>
  )
}
