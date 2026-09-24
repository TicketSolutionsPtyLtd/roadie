import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export const menuPopupClass = [
  'grid min-w-48 max-h-(--available-height) origin-(--transform-origin) gap-0.5 overflow-y-auto p-1',
  'rounded-xl emphasis-floating is-translucent motion-scale outline-none'
].join(' ')

export const menuItemVariants = cva(
  [
    'flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-normal outline-none select-none',
    'data-[highlighted]:bg-subtle data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
  ],
  { variants: { intent: intentVariants } }
)
