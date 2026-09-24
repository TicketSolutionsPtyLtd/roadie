import { cva } from 'class-variance-authority'

export const toggleGroupVariants = cva(
  [
    'group/toggle-group relative inline-grid auto-cols-fr grid-flow-col gap-1 p-0.75',
    'rounded-full emphasis-subtle',
    'data-[orientation=vertical]:grid-flow-row data-[orientation=vertical]:rounded-xl'
  ].join(' ')
)

export const toggleGroupItemVariants = cva(
  [
    'is-interactive relative z-[1]',
    'inline-flex items-center justify-center gap-1.5',
    'rounded-full font-semibold whitespace-nowrap select-none',
    'text-subtle hover:text-normal data-[pressed]:text-strong',
    '[&[aria-label]]:aspect-square [&[aria-label]]:px-0',
    'group-data-[orientation=vertical]/toggle-group:justify-start group-data-[orientation=vertical]/toggle-group:rounded-lg',
    '[&_svg]:shrink-0'
  ].join(' '),
  {
    variants: {
      size: {
        sm: "h-6 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-8 px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10 px-4 text-base [&_svg:not([class*='size-'])]:size-5"
      },
      raisePressed: {
        true: 'data-[pressed]:emphasis-raised',
        false: ''
      }
    },
    defaultVariants: { size: 'md', raisePressed: true }
  }
)

// Hidden until measured, so it never slides in from the corner.
export const toggleGroupIndicatorVariants = cva(
  [
    'pointer-events-none absolute z-0 hidden data-[ready]:block',
    'left-[var(--pressed-item-left)] top-[var(--pressed-item-top)]',
    'h-[var(--pressed-item-height)] w-[var(--pressed-item-width)]',
    'rounded-full emphasis-raised group-data-[orientation=vertical]/toggle-group:rounded-lg',
    'group-data-[disabled]/toggle-group:opacity-50',
    'transition-[left,top,width,height] duration-slow ease-enter'
  ].join(' ')
)

export type ToggleGroupSize = 'sm' | 'md' | 'lg'
export type ToggleGroupDirection = 'horizontal' | 'vertical'
