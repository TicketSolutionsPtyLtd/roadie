import { type ComponentProps, type ReactNode, useId } from 'react'

import {
  ChartBarIcon,
  ClockCountdownIcon,
  WarningIcon
} from '@phosphor-icons/react/ssr'

import type { CardSize, CardState } from '@oztix/roadie-core/dashboard-layout'
import {
  type GoodWhen,
  type ValueFormat,
  type ValueFormatOptions,
  formatValue
} from '@oztix/roadie-core/dataviz'
import { cn } from '@oztix/roadie-core/utils'

import { cardVariants } from '../Card/variants'
import { Delta } from '../Delta'
import { EmptyState } from '../EmptyState'
import { Skeleton } from '../Skeleton'
import { DataCardMoreButton } from './DataCardMoreButton'

export type { DataCardMoreButtonProps } from './DataCardMoreButton'

/** Without its own `format`, a delta takes the card's format and places. */
export type DataCardDelta = {
  value: number
  format?: ValueFormat
  goodWhen?: GoodWhen
  baseline?: number
} & ValueFormatOptions

export type DataCardProps = Omit<ComponentProps<'article'>, 'title'> &
  ValueFormatOptions & {
    /** Fixed name for the card. People and agents refer to the card by it. */
    label: string
    value?: number | string
    /** @default 'number' */
    format?: ValueFormat
    delta?: DataCardDelta
    /** One sentence, used when there is no single headline number. */
    takeaway?: string
    context?: string
    source?: string
    /**
     * Controls at the top right, after the label. Shown in every state, so an
     * action such as refresh still works on a card that failed to load.
     */
    actions?: ReactNode
    /**
     * Switches for what the body shows, such as a chart's mode or measure, in a
     * full-width row under the headline. Shown in every state, so a switch
     * stays put while the new view loads.
     */
    controls?: ReactNode
    size?: CardSize
    /** @default 'ready' */
    state?: CardState
    emptyMessage?: string
    errorMessage?: string
    errorAction?: ReactNode
    staleLabel?: string
    /**
     * Body height while loading, and the least an empty or error state takes,
     * such as the plot height.
     */
    bodyHeight?: string
    children?: ReactNode
  }

const LINE = 'min-w-0 truncate'
const TWO_LINES = 'min-w-0 line-clamp-2 wrap-break-word'

function Headline({
  value,
  format,
  decimals,
  trailingZeroDisplay,
  delta,
  takeaway
}: Pick<
  DataCardProps,
  'value' | 'format' | 'decimals' | 'trailingZeroDisplay' | 'delta' | 'takeaway'
>) {
  if (value !== undefined) {
    const shown =
      typeof value === 'number'
        ? formatValue(value, format, { decimals, trailingZeroDisplay })
        : value
    return (
      <p
        data-slot='data-card-value-row'
        className='flex min-w-0 items-baseline gap-2'
      >
        <span
          data-slot='data-card-value'
          className={cn(LINE, 'font-bold text-strong tabular-nums')}
          title={shown}
        >
          {shown}
        </span>
        {delta && (
          <Delta
            {...delta}
            {...(delta.format === undefined && {
              format,
              decimals: delta.decimals ?? decimals,
              trailingZeroDisplay:
                delta.trailingZeroDisplay ?? trailingZeroDisplay
            })}
            className='shrink-0'
          />
        )}
      </p>
    )
  }
  if (takeaway)
    return <p className='text-display-ui-6 text-strong'>{takeaway}</p>
  return null
}

function LoadingHeadline() {
  return (
    <>
      <Skeleton className='h-7 w-24' />
      <Skeleton className='w-32' />
    </>
  )
}

const startsWithAcronym = (text: string) => /^[A-Z]{2}/.test(text)

const sentenceCaseInline = (label: string) =>
  startsWithAcronym(label)
    ? label
    : label.charAt(0).toLowerCase() + label.slice(1)

export function DataCard({
  label,
  value,
  format,
  decimals,
  trailingZeroDisplay,
  delta,
  takeaway,
  context,
  source,
  actions,
  controls,
  size,
  state = 'ready',
  emptyMessage = "We don't have data for this yet. You'll see it here once it arrives.",
  errorMessage,
  errorAction,
  staleLabel,
  bodyHeight,
  children,
  className,
  ...props
}: DataCardProps) {
  const labelId = useId()
  const showContent = state === 'ready' || state === 'stale'
  const isStat = size === 'stat'
  // An article, not a named section: a dashboard repeats labels such as
  // "Tickets sold" across sections, and landmark names must be unique.
  return (
    <article
      data-slot='data-card'
      data-size={size}
      data-state={state}
      aria-labelledby={labelId}
      aria-busy={state === 'loading' || undefined}
      className={cn(cardVariants({ emphasis: 'normal' }), 'h-full', className)}
      {...props}
    >
      <div
        data-slot='data-card-inner'
        className='grid h-full content-start gap-3'
      >
        <header className='grid min-w-0 gap-1'>
          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3'>
            <h3
              id={labelId}
              title={label}
              data-slot='data-card-label'
              className={cn(
                isStat ? LINE : TWO_LINES,
                'text-sm font-semibold text-subtle'
              )}
            >
              {label}
            </h3>
            {actions && (
              <div
                data-slot='data-card-actions'
                className='flex items-center gap-1 self-start *:self-center'
              >
                {actions}
              </div>
            )}
          </div>
          {state === 'loading' ? (
            <LoadingHeadline />
          ) : (
            showContent && (
              <>
                <Headline
                  value={value}
                  format={format}
                  decimals={decimals}
                  trailingZeroDisplay={trailingZeroDisplay}
                  delta={delta}
                  takeaway={takeaway}
                />
                {context && (
                  <p
                    title={context}
                    data-slot='data-card-context'
                    className={cn(LINE, 'text-sm text-subtle')}
                  >
                    {context}
                  </p>
                )}
              </>
            )
          )}
        </header>
        {controls && (
          <div
            data-slot='data-card-controls'
            className='flex flex-wrap items-center gap-2'
          >
            {controls}
          </div>
        )}
        {state === 'loading' && (
          <Skeleton
            shape='block'
            className='self-end'
            style={{ height: bodyHeight ?? '2rem' }}
          />
        )}
        {showContent && children && (
          <div data-slot='data-card-body' className='self-end'>
            {children}
          </div>
        )}
        {(state === 'empty' || state === 'error') && (
          <EmptyState
            size='sm'
            intent={state === 'error' ? 'danger' : undefined}
            // Fills the body's place, so the card keeps its loading height.
            className={cn('content-center', (isStat || bodyHeight) && 'py-0')}
            style={{ minHeight: bodyHeight }}
          >
            {!isStat && (
              <EmptyState.IconTile aria-hidden>
                {state === 'error' ? (
                  <WarningIcon weight='duotone' />
                ) : (
                  <ChartBarIcon weight='duotone' />
                )}
              </EmptyState.IconTile>
            )}
            {/* A card can't know the page's heading outline. */}
            <EmptyState.Title
              render={<p />}
              className={isStat ? 'text-sm' : undefined}
            >
              {state === 'empty'
                ? emptyMessage
                : (errorMessage ??
                  `We couldn't load ${sentenceCaseInline(label)}. Try again in a minute.`)}
            </EmptyState.Title>
            {state === 'error' && errorAction && (
              <EmptyState.Actions>{errorAction}</EmptyState.Actions>
            )}
          </EmptyState>
        )}
        {(showContent || state === 'loading') &&
          (source || (state === 'stale' && staleLabel)) && (
            <footer className='flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-subtler pt-2 text-xs text-subtle'>
              {source && <span>{source}</span>}
              {state === 'stale' && staleLabel && (
                <span className='inline-flex items-center gap-1'>
                  <ClockCountdownIcon
                    weight='bold'
                    className='size-3 text-chart-status-warning'
                    aria-hidden
                  />
                  {staleLabel}
                </span>
              )}
            </footer>
          )}
      </div>
    </article>
  )
}
DataCard.displayName = 'DataCard'
DataCard.MoreButton = DataCardMoreButton
