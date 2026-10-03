'use client'

import { useRef, useState } from 'react'

import { DotsThreeIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { Button, IconButton } from '../Button'
import { Menu } from '../Menu'
import { Tooltip } from '../Tooltip'
import {
  RecordsConfirm,
  needsConfirm,
  reportActionError
} from './RecordsConfirm'
import { useRecordsContext } from './context'
import { useNarrow } from './narrow'
import type { RecordsAction } from './types'

const MORE = 'More actions'

export type RecordsActionsProps<Row extends object = object> = {
  /** Act on everything the search and filters match. The first is a button and the rest a More actions menu; in a toolbar under 40rem, all are in the menu. */
  actions: readonly RecordsAction<Row>[]
  className?: string
}

/** Actions on every matching record, with nothing selected, such as an export. */
export function RecordsActions<Row extends object>({
  actions,
  className
}: RecordsActionsProps<Row>) {
  const { records, latestRecords } = useRecordsContext()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const narrow = useNarrow(anchorRef, { parent: true })
  // An index, as a new actions array each render holds new objects.
  const [running, setRunning] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<number | null>(null)

  const run = async (index: number) => {
    const action = actions[index]
    if (!action) return
    setRunning(index)
    // The latest records, so a confirm that rendered earlier acts on what shows now.
    const current = latestRecords.current
    try {
      // The consumer's Row narrows the shared instance, as Records.Root's does.
      await action.onAction(
        current.appliedView.query,
        current as unknown as Parameters<typeof action.onAction>[1]
      )
    } catch (error) {
      reportActionError(error)
    } finally {
      setRunning(null)
    }
  }
  const start = (index: number) =>
    needsConfirm(actions[index]!) ? setConfirming(index) : void run(index)

  const inline = narrow ? undefined : actions[0]
  const first = narrow ? 0 : 1
  const menu = actions.slice(first)
  const confirmed = confirming === null ? undefined : actions[confirming]
  // Focusable while busy, so focus stays on the control that started it.
  const busy = { disabled: running !== null, focusableWhenDisabled: true }

  return (
    <>
      {/* Measures its parent, such as the toolbar, to decide what fits. */}
      <span ref={anchorRef} hidden />
      {actions.length > 0 && (
        <div
          data-slot='records-actions'
          className={cn('flex shrink-0 items-center gap-2', className)}
        >
          {inline && (
            <Button
              {...busy}
              emphasis='normal'
              intent={inline.intent}
              aria-busy={running === 0 || undefined}
              onClick={() => start(0)}
            >
              {inline.icon}
              {inline.label}
            </Button>
          )}
          {menu.length > 0 && (
            <Menu>
              <Tooltip>
                <Tooltip.Trigger
                  render={
                    <Menu.Trigger
                      render={
                        <IconButton
                          {...busy}
                          aria-label={MORE}
                          emphasis='subtler'
                          aria-busy={
                            (running !== null && running >= first) || undefined
                          }
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
                    onClick={() => start(first + offset)}
                  >
                    {action.label}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu>
          )}
          {confirming !== null && confirmed && (
            <RecordsConfirm
              action={confirmed}
              count={records.resultCount}
              recordName={records.recordName}
              onCancel={() => setConfirming(null)}
              onConfirm={() => {
                setConfirming(null)
                void run(confirming)
              }}
            />
          )}
        </div>
      )}
    </>
  )
}
RecordsActions.displayName = 'Records.Actions'
