'use client'

import { useRef, useState } from 'react'

import { DotsThreeIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { Button, IconButton } from '../Button'
import { Menu } from '../Menu'
import { Tooltip } from '../Tooltip'
import { RecordsConfirm, attempt, needsConfirm } from './RecordsConfirm'
import { useRecordsData, useRecordsStable } from './context'
import type { RecordsAction } from './types'

const MORE = 'More actions'
// Under 40rem of the nearest container, such as the toolbar, every action is in the menu.
const NARROW_HIDDEN = '@max-[40rem]:hidden'
const WIDE_HIDDEN = '@min-[40rem]:hidden'

/** An action started, and whether from the menu, which then shows it busy. */
type Started = { index: number; menu: boolean }

export type RecordsActionsProps<Row extends object = object> = {
  /** Act on everything the search and filters match. The first is a button and the rest a More actions menu; in a container under 40rem, such as `Records.Header`, all are in the menu. */
  actions: readonly RecordsAction<Row>[]
  className?: string
}

/** Actions on every matching record, with nothing selected, such as an export. */
export function RecordsActions<Row extends object>({
  actions,
  className
}: RecordsActionsProps<Row>) {
  const records = useRecordsData()
  const { latestRecords } = useRecordsStable()
  const inlineRef = useRef<HTMLButtonElement>(null)
  // Whether the menu holds the first action too, read as it opens, since CSS hides the button.
  const [folded, setFolded] = useState(false)
  // An index, as a new actions array each render holds new objects.
  const [running, setRunning] = useState<Started | null>(null)
  const [confirming, setConfirming] = useState<Started | null>(null)

  const run = async (started: Started) => {
    const action = actions[started.index]
    if (!action) return
    setRunning(started)
    // The latest records, so a confirm that rendered earlier acts on what shows now.
    const current = latestRecords.current
    await attempt(
      () =>
        // The consumer's Row narrows the shared instance, as Records.Root's does.
        action.onAction({
          query: current.scopedQuery,
          request: {
            version: current.request.version,
            query: current.request.query
          },
          timeZone: current.timeZone,
          now: current.now,
          records: current as unknown as Parameters<
            typeof action.onAction
          >[0]['records']
        }),
      { done: () => setRunning(null) }
    )
  }
  const start = (started: Started) =>
    needsConfirm(actions[started.index]!)
      ? setConfirming(started)
      : void run(started)

  const inline = actions[0]
  const first = folded ? 0 : 1
  const menu = actions.slice(first)
  const confirmed = confirming === null ? undefined : actions[confirming.index]
  // Focusable while busy, so focus stays on the control that started it.
  const busy = { disabled: running !== null, focusableWhenDisabled: true }

  return (
    actions.length > 0 && (
      <div
        data-slot='records-actions'
        className={cn('flex shrink-0 items-center gap-2', className)}
      >
        {inline && (
          <Button
            {...busy}
            ref={inlineRef}
            emphasis='normal'
            intent={inline.intent}
            aria-busy={(running?.index === 0 && !running.menu) || undefined}
            onClick={() => start({ index: 0, menu: false })}
            className={NARROW_HIDDEN}
          >
            {inline.icon}
            {inline.label}
          </Button>
        )}
        <Menu
          onOpenChange={(open) => {
            const button = inlineRef.current
            if (open && button)
              setFolded(getComputedStyle(button).display === 'none')
          }}
        >
          <Tooltip>
            <Tooltip.Trigger
              render={
                <Menu.Trigger
                  render={
                    <IconButton
                      {...busy}
                      aria-label={MORE}
                      emphasis='subtler'
                      aria-busy={running?.menu || undefined}
                      // A lone action needs the menu only once its button folds.
                      className={actions.length === 1 ? WIDE_HIDDEN : undefined}
                    >
                      <DotsThreeIcon
                        weight='bold'
                        className='size-4'
                        aria-hidden
                      />
                    </IconButton>
                  }
                />
              }
            />
            <Tooltip.Content>{MORE}</Tooltip.Content>
          </Tooltip>
          <Menu.Content>
            {menu.map((action, offset) => (
              <Menu.Item
                key={`${action.label}-${first + offset}`}
                icon={action.icon}
                intent={action.intent}
                onClick={() => start({ index: first + offset, menu: true })}
              >
                {action.label}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu>
        {confirming !== null && confirmed && (
          <RecordsConfirm
            action={confirmed}
            count={records.resultCount}
            exact={records.resultCountExact}
            recordName={records.recordName}
            onCancel={() => setConfirming(null)}
            onConfirm={() => {
              setConfirming(null)
              void run(confirming)
            }}
          />
        )}
      </div>
    )
  )
}
RecordsActions.displayName = 'Records.Actions'
