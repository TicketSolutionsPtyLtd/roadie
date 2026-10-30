import { cva } from 'class-variance-authority'

import { horizontalScrollClass } from '../../variants'

// Subtler has no track but keeps a transparent border, so every emphasis
// stays the height of a Button. Items never shrink below their label; a
// horizontal group that outgrows its container scrolls instead, as Tabs does.
export const toggleGroupVariants = cva(
  [
    'group/toggle-group relative inline-grid auto-cols-[minmax(max-content,1fr)] grid-flow-col p-0.75',
    horizontalScrollClass,
    // Fades a side that can still scroll, as `watchScrollEdges` marks it.
    '[--toggle-group-fade:24px] [--toggle-group-fade-left:0px] [--toggle-group-fade-right:0px]',
    'data-[overflow-left]:[--toggle-group-fade-left:var(--toggle-group-fade)] data-[overflow-right]:[--toggle-group-fade-right:var(--toggle-group-fade)]',
    'data-[orientation=horizontal]:[&:is([data-overflow-left],[data-overflow-right])]:[mask-image:linear-gradient(to_right,transparent_0,black_var(--toggle-group-fade-left),black_calc(100%-var(--toggle-group-fade-right)),transparent_100%)]',
    'rounded-full',
    'data-[orientation=vertical]:grid-flow-row data-[orientation=vertical]:rounded-xl'
  ].join(' '),
  {
    variants: {
      emphasis: {
        normal: 'emphasis-normal',
        subtle: 'emphasis-subtle',
        subtler: 'border'
      }
    },
    defaultVariants: { emphasis: 'normal' }
  }
)

export const toggleGroupItemVariants = cva(
  [
    'is-interactive relative z-1',
    'inline-flex items-center justify-center gap-1.5',
    'rounded-full font-semibold whitespace-nowrap select-none',
    // Pulled in by a pixel so the ring fits the track's padding, which clips it.
    'focus-visible:-outline-offset-1',
    // Unpressed items take a subtler button's hover fill, over any track. A
    // fixed border keeps their size as they're pressed, and the padding gives
    // its width back.
    'border not-data-[pressed]:emphasis-subtler not-data-[pressed]:is-unselected',
    'data-[icon-only]:aspect-square data-[icon-only]:px-0',
    'group-data-[orientation=vertical]/toggle-group:justify-start group-data-[orientation=vertical]/toggle-group:rounded-lg',
    '[&_svg]:shrink-0'
  ].join(' '),
  {
    variants: {
      size: {
        sm: "h-6 px-[calc(--spacing(2.5)-1px)] text-xs [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-8 px-[calc(--spacing(3)-1px)] text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10 px-[calc(--spacing(4)-1px)] text-base [&_svg:not([class*='size-'])]:size-5"
      },
      emphasis: {
        normal: 'data-[pressed]:is-selected-label-on-strong',
        subtle: 'data-[pressed]:is-selected-label-on-strong',
        subtler: 'data-[pressed]:is-selected-label'
      },
      raisePressed: { true: '', false: '' }
    },
    compoundVariants: [
      {
        raisePressed: true,
        emphasis: ['normal', 'subtle'],
        className: 'data-[pressed]:emphasis-strong'
      },
      {
        raisePressed: true,
        emphasis: 'subtler',
        className: 'data-[pressed]:emphasis-subtle data-[pressed]:is-selected'
      }
    ],
    defaultVariants: { size: 'md', emphasis: 'normal', raisePressed: true }
  }
)

// Hidden until measured, so it never slides in from the corner.
export const toggleGroupIndicatorVariants = cva(
  [
    'pointer-events-none absolute z-0 hidden data-[ready]:block',
    'left-[var(--pressed-item-left)] top-[var(--pressed-item-top)]',
    'h-[var(--pressed-item-height)] w-[var(--pressed-item-width)]',
    'rounded-full group-data-[orientation=vertical]/toggle-group:rounded-lg',
    'group-data-[disabled]/toggle-group:opacity-50',
    'transition-[left,top,width,height] duration-slow ease-enter'
  ].join(' '),
  {
    variants: {
      emphasis: {
        normal: 'emphasis-strong',
        subtle: 'emphasis-strong',
        subtler: 'emphasis-subtle is-selected'
      }
    },
    defaultVariants: { emphasis: 'normal' }
  }
)

export type ToggleGroupSize = 'sm' | 'md' | 'lg'
export type ToggleGroupDirection = 'horizontal' | 'vertical'
export type ToggleGroupEmphasis = 'normal' | 'subtle' | 'subtler'
