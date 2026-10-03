'use client'

import { useRef, useState } from 'react'

import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CopyIcon,
  FloppyDiskIcon,
  PencilSimpleIcon,
  TrashIcon
} from '@phosphor-icons/react'

import type { RecordView } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { Button } from '../Button'
import { Menu } from '../Menu'
import { reportActionError } from './RecordsConfirm'
import {
  RecordsViewDelete,
  RecordsViewName,
  type ViewDialog
} from './RecordsViewDialogs'
import { useRecordsContext } from './context'

/** Saves a view where the app keeps views. Reject to say it failed. */
export type RecordsViewHandler = (view: RecordView) => void | Promise<void>

export type RecordsViewActionsProps = {
  /** Saves the changes over the `baseline`: gets the view with the baseline's id and name. Leave it out for a view people can't change, such as a preset. */
  onSave?: RecordsViewHandler
  /** Saves the view as a new one: gets it with the name given and no id, for the app to assign. */
  onSaveAs?: RecordsViewHandler
  /** Gets the `baseline` with its new name, leaving any changes unsaved. */
  onRename?: RecordsViewHandler
  /** Gets the `baseline` once people confirm. Open another view once it resolves. */
  onDelete?: RecordsViewHandler
  className?: string
}

/**
 * The open view's name, marked when it has changed, with a menu to save,
 * save as, rename, reset or delete it. The app keeps the views: each action
 * calls its handler, and Reset goes back to the records' `baseline`. Renders
 * nothing with no action to offer.
 */
export function RecordsViewActions({
  onSave,
  onSaveAs,
  onRename,
  onDelete,
  className
}: RecordsViewActionsProps) {
  const { records } = useRecordsContext()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [dialog, setDialog] = useState<ViewDialog | null>(null)
  const [saving, setSaving] = useState(false)
  const { baseline, modified, view } = records

  const save = onSave && baseline && modified
  const reset = baseline && modified
  const rename = onRename && baseline
  const remove = onDelete && baseline
  if (!save && !reset && !onSaveAs && !rename && !remove) return null

  const name = baseline?.name ?? 'Unsaved view'
  const runSave = async () => {
    if (!onSave || !baseline) return
    setSaving(true)
    try {
      await onSave({ ...view, id: baseline.id, name: baseline.name })
    } catch (error) {
      reportActionError(error)
    } finally {
      setSaving(false)
    }
  }
  const asNew = (name: string) => {
    const copy: RecordView = { ...view, name }
    delete copy.id
    return copy
  }

  return (
    <>
      <Menu>
        <Menu.Trigger
          render={
            <Button
              ref={triggerRef}
              emphasis='normal'
              aria-label={`View: ${name}${modified ? ', modified' : ''}`}
              aria-busy={saving || undefined}
              disabled={saving}
              focusableWhenDisabled
              data-slot='records-view-actions'
              className={cn('max-w-64 shrink-0', className)}
            >
              <span className='truncate'>{name}</span>
              {modified && (
                <span
                  data-slot='records-view-modified'
                  aria-hidden
                  className='size-2 shrink-0 rounded-full bg-strong intent-accent forced-colors:bg-[Highlight]'
                />
              )}
              <CaretDownIcon weight='bold' className='size-4' aria-hidden />
            </Button>
          }
        />
        <Menu.Content>
          {reset && (
            <>
              <Menu.Group>
                <Menu.GroupLabel>Unsaved changes</Menu.GroupLabel>
                {save && (
                  <Menu.Item
                    icon={<FloppyDiskIcon weight='bold' />}
                    onClick={() => void runSave()}
                  >
                    Save view
                  </Menu.Item>
                )}
                <Menu.Item
                  icon={<ArrowCounterClockwiseIcon weight='bold' />}
                  onClick={records.resetView}
                >
                  Reset view
                </Menu.Item>
              </Menu.Group>
              {(onSaveAs || rename || remove) && <Menu.Separator />}
            </>
          )}
          {onSaveAs && (
            <Menu.Item
              icon={<CopyIcon weight='bold' />}
              onClick={() => setDialog('save-as')}
            >
              Save as new view
            </Menu.Item>
          )}
          {rename && (
            <Menu.Item
              icon={<PencilSimpleIcon weight='bold' />}
              onClick={() => setDialog('rename')}
            >
              Rename view
            </Menu.Item>
          )}
          {remove && (
            <Menu.Item
              icon={<TrashIcon weight='bold' />}
              intent='danger'
              onClick={() => setDialog('delete')}
            >
              Delete view
            </Menu.Item>
          )}
        </Menu.Content>
      </Menu>
      {dialog === 'save-as' && onSaveAs && (
        <RecordsViewName
          kind='save-as'
          initialName=''
          finalFocus={triggerRef}
          onClose={() => setDialog(null)}
          onSubmit={(name) => onSaveAs(asNew(name))}
        />
      )}
      {dialog === 'rename' && onRename && baseline && (
        <RecordsViewName
          kind='rename'
          initialName={baseline.name ?? ''}
          finalFocus={triggerRef}
          onClose={() => setDialog(null)}
          onSubmit={(name) => onRename({ ...baseline, name })}
        />
      )}
      {dialog === 'delete' && onDelete && baseline && (
        <RecordsViewDelete
          name={name}
          finalFocus={triggerRef}
          onClose={() => setDialog(null)}
          onConfirm={() => onDelete(baseline)}
        />
      )}
    </>
  )
}
RecordsViewActions.displayName = 'Records.ViewActions'
