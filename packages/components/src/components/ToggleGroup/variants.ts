import { cva } from 'class-variance-authority'

// Without a track, subtler keeps the padding and a transparent border, so
// every emphasis stays the height of a Button.
export const toggleGroupVariants = cva(
  [
    'group/toggle-group relative inline-grid auto-cols-fr grid-flow-col gap-1 p-0.75',
    'rounded-full',
    'data-[orientation=vertical]:grid-flow-row data-[orientation=vertical]:rounded-xl'
  ].join(' '),
  {
    variants: {
      emphasis: {
        strong: 'emphasis-subtle',
        normal: 'emphasis-subtle',
        subtle: 'emphasis-subtle',
        subtler: 'border'
      }
    },
    defaultVariants: { emphasis: 'normal' }
  }
)

export const toggleGroupItemVariants = cva(
  [
    'is-interactive relative z-[1]',
    'inline-flex items-center justify-center gap-1.5',
    'rounded-full font-semibold whitespace-nowrap select-none',
    'text-subtle hover:text-normal',
    'data-[icon-only]:aspect-square data-[icon-only]:px-0',
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
      emphasis: {
        strong: 'data-[pressed]:text-inverted',
        normal: 'data-[pressed]:text-strong',
        subtle: 'data-[pressed]:text-strong',
        subtler: 'data-[pressed]:text-strong'
      },
      raisePressed: { true: '', false: '' }
    },
    compoundVariants: [
      {
        raisePressed: true,
        emphasis: 'strong',
        className: 'data-[pressed]:emphasis-strong'
      },
      {
        raisePressed: true,
        emphasis: 'normal',
        className: 'data-[pressed]:emphasis-raised'
      },
      {
        raisePressed: true,
        emphasis: 'subtle',
        className:
          'data-[pressed]:emphasis-subtle data-[pressed]:bg-[var(--intent-4a)]'
      },
      {
        raisePressed: true,
        emphasis: 'subtler',
        className: 'data-[pressed]:emphasis-subtle'
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
        strong: 'emphasis-strong',
        normal: 'emphasis-raised',
        // A step deeper than the track's own tint, so the pill reads on it.
        subtle: 'emphasis-subtle bg-[var(--intent-4a)]',
        subtler: 'emphasis-subtle'
      }
    },
    defaultVariants: { emphasis: 'normal' }
  }
)

export type ToggleGroupSize = 'sm' | 'md' | 'lg'
export type ToggleGroupDirection = 'horizontal' | 'vertical'
export type ToggleGroupEmphasis = 'strong' | 'normal' | 'subtle' | 'subtler'
