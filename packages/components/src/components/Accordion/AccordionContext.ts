'use client'

import { createContext } from 'react'

export type AccordionEmphasis = 'normal' | 'subtle' | 'subtler' | null

export type AccordionContextValue = {
  name: string | undefined
  emphasis: AccordionEmphasis
}

export const AccordionContext = createContext<AccordionContextValue>({
  name: undefined,
  emphasis: 'normal'
})

export const accordionItemVariants: Record<
  'normal' | 'subtle' | 'subtler',
  string
> = {
  normal: '',
  subtle: 'emphasis-subtle first:rounded-t-xl last:rounded-b-xl',
  subtler: ''
}
