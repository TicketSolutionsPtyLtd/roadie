import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

/**
 * A two-row calendar tile: the date reduced to a month and a day.
 *
 * Decorative by design. It never carries a year, so whatever sits beside it
 * owns the full date. Strings come from `formatGlyph`, never `new Date()` at
 * the call site. See /foundations/date-and-time.
 */
export const calendarTileVariants = cva(
  'inline-grid grid-rows-[auto_1fr] overflow-hidden rounded-xl text-center leading-none',
  {
    variants: {
      intent: intentVariants,
      // The day inherits from here, so each emphasis names its foreground once.
      emphasis: {
        strong: 'emphasis-strong',
        normal: 'emphasis-normal text-subtle',
        subtle: 'emphasis-subtle text-subtle',
        subtler: 'emphasis-subtler text-subtle'
      },
      size: {
        sm: 'size-10',
        md: 'size-12',
        lg: 'size-14'
      }
    },
    // No default intent: it flows down the cascade.
    defaultVariants: {
      emphasis: 'subtle',
      size: 'md'
    }
  }
)

/**
 * The band is a surface, so it takes a preset. On a `strong` tile the body
 * already carries the saturated fill, so the band inverts to the light preset.
 *
 * Not `emphasis-inverted` despite the name: that is intent step 12, a
 * near-black, where the band wants step 9.
 */
const calendarTileTopVariants = cva(
  'py-[3px] font-bold tracking-wider uppercase',
  {
    variants: {
      emphasis: {
        strong: 'emphasis-normal',
        normal: 'emphasis-strong',
        subtle: 'emphasis-strong',
        subtler: 'emphasis-strong'
      },
      // The box scales, so the type scales with it.
      size: {
        sm: 'text-[9px]',
        md: 'text-[10px]',
        lg: 'text-[11px]'
      }
    },
    defaultVariants: { emphasis: 'subtle', size: 'md' }
  }
)

/** Colour comes from the tile's own emphasis; only the scale belongs here. */
const calendarTileDayVariants = cva('grid place-content-center font-bold', {
  variants: {
    size: {
      sm: 'text-base',
      md: 'text-lg',
      lg: 'text-xl'
    }
  },
  defaultVariants: { size: 'md' }
})

interface CalendarTileOwnProps extends VariantProps<
  typeof calendarTileVariants
> {
  /** Day of the month, e.g. `27`. */
  day: string | number
  /**
   * The full date, for assistive tech. The tile abbreviates hard, so without
   * this a labelless tile is `aria-hidden` and announces nothing.
   */
  label?: string
  /**
   * Machine-readable value from `formatMachine`. Setting it renders a `<time>`
   * element instead of a plain box, so the rest of the props are typed against
   * `time` rather than `div`.
   *
   * Set it only when the tile is the **only** date in its region. If a date
   * line sits beside it, that line owns the `<time>`, and two of them would
   * publish the same instant twice.
   */
  dateTime?: string
}

/**
 * The top row is a month or a weekday, never neither: a tile with an empty
 * band is not a calendar tile. `weekday` wins when both are given.
 */
type CalendarTileTop =
  | {
      /** Short month, e.g. `NOV`. Ignored when `weekday` is set. */
      month: string
      /** Short weekday, e.g. `FRI`. Replaces the month in the top row. */
      weekday?: string
    }
  | { month?: string; weekday: string }

/**
 * `dateTime` decides which element renders, so it also decides which element's
 * props apply. Without the split a consumer's `ref` is typed `HTMLDivElement`
 * while an `HTMLTimeElement` arrives.
 */
export type CalendarTileProps =
  | (CalendarTileOwnProps &
      CalendarTileTop &
      Omit<ComponentProps<'div'>, 'children'> & { dateTime?: undefined })
  | (CalendarTileOwnProps &
      CalendarTileTop &
      Omit<ComponentProps<'time'>, 'children' | 'dateTime'> & {
        dateTime: string
      })

export function CalendarTile({
  className,
  intent,
  emphasis,
  size,
  month,
  day,
  weekday,
  label,
  dateTime,
  ...props
}: CalendarTileProps) {
  const top = weekday ?? month
  const classes = cn(
    calendarTileVariants({ intent, emphasis, size, className })
  )

  const rows = (
    <>
      <span
        data-slot='calendar-tile-top'
        className={calendarTileTopVariants({ emphasis, size })}
      >
        {top}
      </span>
      <span
        data-slot='calendar-tile-day'
        className={calendarTileDayVariants({ size })}
      >
        {day}
      </span>
    </>
  )

  // A <time> with element children must carry a datetime attribute, so the
  // prop is what gates the semantic element.
  if (dateTime) {
    return (
      <time
        data-slot='calendar-tile'
        dateTime={dateTime}
        // Without a label the tile would announce 'NOV 27' with no weekday and
        // no year. The machine value is a poor name but an honest one.
        aria-label={label ?? dateTime}
        className={classes}
        {...(props as ComponentProps<'time'>)}
      >
        {rows}
      </time>
    )
  }

  return (
    <div
      data-slot='calendar-tile'
      // The rows are abbreviations; the label carries the real date. Without a
      // label the tile is decorative and its neighbour owns the accessible name.
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={classes}
      {...(props as ComponentProps<'div'>)}
    >
      {rows}
    </div>
  )
}

CalendarTile.displayName = 'CalendarTile'
