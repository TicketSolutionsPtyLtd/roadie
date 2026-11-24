'use client'

import { useEffect, useEffectEvent, useState } from 'react'

import { CloudArrowUpIcon, ProhibitIcon } from '@phosphor-icons/react/ssr'
import { createPortal } from 'react-dom'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { IconTile } from '../IconTile'
import { filePageTarget } from '../Sortable/dnd/file'
import { useFileUploadContext } from './FileUploadContext'
import { matchesAccept } from './checkFile'

// The fields that own the page's drops, so a second one can be warned about.
let owners = 0

/**
 * Takes files dropped anywhere on the page for `FileUpload.Root`'s
 * `pageDrop`, and covers the window with what a drop would do.
 */
export function FileUploadPageDrop({ accept }: { accept?: string }) {
  const { take, disabled, labelId, maxFiles } =
    useFileUploadContext('FileUpload.Root')
  const [types, setTypes] = useState<string[] | null>(null)
  const onDrop = useEffectEvent((files: File[]) => take(files))
  useEffect(() => {
    if (disabled) return
    if (++owners > 1 && isDev())
      console.warn(
        'Roadie: more than one FileUpload has pageDrop. Only one field on a page should take drops from the whole window.'
      )
    const cleanup = filePageTarget({ onDragChange: setTypes, onDrop })
    return () => {
      owners--
      cleanup()
      setTypes(null)
    }
  }, [disabled])

  if (!types) return null
  const count = Math.min(types.length, maxFiles)
  // Only a MIME type can be judged mid-drag: a name, and so an extension,
  // is hidden until the drop.
  const wrong =
    accept !== undefined &&
    !/(^|,)\s*\./.test(accept) &&
    types.length > 0 &&
    types.every((type) => type && !matchesAccept({ name: '', type }, accept))
  const label =
    (labelId && document.getElementById(labelId)?.textContent) || 'this field'
  return createPortal(
    <div
      aria-hidden
      data-slot='file-upload-page-drop'
      data-wrong={wrong || undefined}
      className='pointer-events-none fixed inset-0 z-overlay grid animate-fade-in p-6'
    >
      <div
        className={cn(
          'grid animate-scale-in content-center justify-items-center gap-3 rounded-7xl border-2 border-dashed emphasis-subtle is-translucent border-strong p-6 text-center',
          wrong ? 'intent-danger' : 'intent-accent'
        )}
      >
        <IconTile size='3xl' emphasis='strong'>
          {wrong ? (
            <ProhibitIcon weight='bold' />
          ) : (
            <CloudArrowUpIcon weight='bold' />
          )}
        </IconTile>
        <p className='text-display-ui-4 text-strong'>
          {wrong
            ? `${label} doesn't take ${types.length > 1 ? 'these file types' : 'this file type'}`
            : `Drop to add ${count > 1 ? `${count} files` : 'a file'} to ${label}`}
        </p>
      </div>
    </div>,
    document.body
  )
}
