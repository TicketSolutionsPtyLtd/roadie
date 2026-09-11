import { cva } from 'class-variance-authority'

export type TooltipEmphasis = 'strong' | 'floating'

export type TooltipSide =
  'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end'

// `--tooltip-surface` and `--tooltip-rim` let the portaled arrow match
// whichever surface the popup resolved to. `data-[instant]` is Base UI's
// signal that a grouped neighbour opened this one instantly — scaling in
// again would flicker.
export const tooltipPopupVariants = cva(
  [
    'max-w-[min(18rem,var(--available-width))] origin-[var(--transform-origin)]',
    'rounded-lg px-2.5 py-1.5 text-sm font-medium text-pretty',
    'motion-scale data-[instant]:transition-none'
  ],
  {
    variants: {
      emphasis: {
        strong:
          'emphasis-strong [--tooltip-rim:transparent] [--tooltip-surface:var(--intent-bg-strong)]',
        floating:
          'emphasis-floating [--tooltip-rim:var(--rim-light-edge)] [--tooltip-surface:var(--intent-bg-raised)]'
      }
    },
    defaultVariants: { emphasis: 'strong' }
  }
)
