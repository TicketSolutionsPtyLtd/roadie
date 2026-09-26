import { type ComponentProps, type ReactNode, useId } from 'react'

import { ClockCountdownIcon } from '@phosphor-icons/react/ssr'

import type { CardSize, CardState } from '@oztix/roadie-core/dashboard-layout'
import {
  type GoodWhen,
  type ValueFormat,
  formatValue
} from '@oztix/roadie-core/dataviz'
import { cn } from '@oztix/roadie-core/utils'

import { cardVariants } from '../Card/variants'
import { Delta } from '../Delta'
import { Skeleton } from '../Skeleton'
import { DataCardMoreButton } from './DataCardMoreButton'

export type { DataCardMoreButtonProps } from './DataCardMoreButton'

export type DataCardDelta = {
  value: number
  format?: ValueFormat
  goodWhen?: GoodWhen
  baseline?: number
}

export type DataCardProps = Omit<ComponentProps<'article'>, 'title'> & {
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
  size?: CardSize
  /** @default 'ready' */
  state?: CardState
  emptyMessage?: string
  errorMessage?: string
  errorAction?: ReactNode
  staleLabel?: string
  /** Body height while loading, such as the plot height. */
  bodyHeight?: string
  children?: ReactNode
}

const LINE = 'min-w-0 truncate'

function Headline({
  value,
  format,
  delta,
  takeaway
}: Pick<DataCardProps, 'value' | 'format' | 'delta' | 'takeaway'>) {
  if (value !== undefined) {
    const shown = typeof value === 'number' ? formatValue(value, format) : value
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
            format={delta.format ?? format}
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
  delta,
  takeaway,
  context,
  source,
  actions,
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
              className={cn(LINE, 'text-sm font-semibold text-subtle')}
            >
              {label}
            </h3>
            {actions && (
              <div
                data-slot='data-card-actions'
                className='flex h-0 items-center gap-1 self-center *:self-center'
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
        {state === 'empty' && (
          <p className='text-sm text-subtle'>{emptyMessage}</p>
        )}
        {state === 'error' && (
          <div className='grid justify-items-start gap-2'>
            <p className='text-sm text-subtle'>
              {errorMessage ??
                `We couldn't load ${sentenceCaseInline(label)}. Try again in a minute.`}
            </p>
            {errorAction}
          </div>
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
