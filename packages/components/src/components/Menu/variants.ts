import { cva } from 'class-variance-authority'

import {
  floatingPopupClass,
  focusedRowHighlightClass,
  intentVariants
} from '../../variants'

export const menuPopupClass = `grid min-w-48 gap-0.5 ${floatingPopupClass}`

export const menuItemVariants = cva(
  [
    'flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-normal outline-none select-none',
    focusedRowHighlightClass,
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
  ],
  { variants: { intent: intentVariants } }
)
