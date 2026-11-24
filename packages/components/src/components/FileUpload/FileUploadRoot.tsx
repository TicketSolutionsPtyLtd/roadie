'use client'

import {
  type ComponentProps,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext, useFieldControlError } from '../Field/FieldContext'
import {
  FileUploadContext,
  type FileUploadUpload as Upload
} from './FileUploadContext'
import { FileUploadDropzone } from './FileUploadDropzone'
import { FileUploadList } from './FileUploadList'
import { FileUploadPageDrop } from './FileUploadPageDrop'
import {
  type FileRules,
  type FileUploadRejection,
  checkFile
} from './checkFile'

export type FileUploadRootProps = Omit<
  ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> &
  FileRules & {
    /** The form field name the files post under. */
    name?: string
    /** The chosen files, when you control them. */
    value?: File[]
    /** The files to start with, when the field controls them. */
    defaultValue?: File[]
    /** Called with the new files once a pick passes every rule. */
    onValueChange?: (files: File[]) => void
    /**
     * Checks a file the other rules pass, such as an image's pixel size.
     * Return a message to turn it away with the code `invalid`, or `null` to
     * take it. It can be async; a newer pick wins over a check still running.
     */
    validate?: (
      file: File
    ) => string | null | undefined | Promise<string | null | undefined>
    /** Called with the files a pick turned away, each with its code and message. */
    onReject?: (rejections: FileUploadRejection[]) => void
    /** How many files the field holds. Above 1, picks add to the files, and they can be reordered. @default 1 */
    maxFiles?: number
    /** Which camera a phone opens instead of its file picker. Passed to the native input. */
    capture?: 'user' | 'environment'
    /** Takes files dropped anywhere on the page, with an overlay that names the field while they're dragged in. Give it to one field per page. */
    pageDrop?: boolean
    disabled?: boolean
    required?: boolean
    /**
     * Uploads a file added after the field mounts, three at a time. Report
     * progress from 0 to 1 with `onProgress`, and stop when `signal` aborts,
     * as it does when the file leaves the value. What it resolves becomes the
     * item's `result`.
     */
    onUpload?: (
      file: File,
      options: { signal: AbortSignal; onProgress: (progress: number) => void }
    ) => Promise<unknown>
  }

/** Starts queued uploads until three are running. */
function promote(map: Map<File, Upload>) {
  let running = [...map.values()].filter(
    ({ status }) => status === 'uploading'
  ).length
  for (const [file, upload] of map)
    if (upload.status === 'queued' && running++ < 3)
      map.set(file, { ...upload, status: 'uploading' })
  return map
}

/**
 * A file field. It holds the chosen files and keeps a native file input in
 * step with them, so a form posts them under `name`. With no children it
 * renders a Dropzone with the List of chosen files under it. Files can also be dropped on a Control, or pasted
 * anywhere inside.
 */
export function FileUploadRoot({
  name,
  value,
  defaultValue,
  onValueChange,
  accept,
  maxFileSize,
  minFileSize,
  onReject,
  validate,
  maxFiles = 1,
  capture,
  pageDrop,
  disabled,
  required,
  onUpload,
  className,
  children,
  onPaste,
  ...props
}: FileUploadRootProps) {
  const field = useFieldContext()
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? [])
  const files = value ?? uncontrolled
  const [error, setError] = useState<string | null>(null)
  useFieldControlError(error)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement>(null)
  const ownId = useId()
  const inputId = field.fieldId || `${ownId}-input`

  // Files that join the value after mount queue for `onUpload`; the ones it
  // starts with don't.
  const [uploads, setUploads] = useState<ReadonlyMap<File, Upload>>(new Map())
  const [previous, setPrevious] = useState(files)
  const [checking, setChecking] = useState<File[]>([])
  const [said, say] = useState('')
  const [alarm, raise] = useState('')
  if (previous !== files) {
    setPrevious(files)
    const added = files.filter((file) => !previous.includes(file))
    if (added.length)
      say(
        `${added.length > 1 ? `${added.length} files` : added[0]!.name} added.`
      )
    setUploads((map) => {
      const next = new Map([...map].filter(([file]) => files.includes(file)))
      if (onUpload)
        for (const file of added)
          next.set(file, { status: 'queued', progress: 0 })
      return promote(next)
    })
  }

  // Says which uploads have just finished or failed, counting every one that
  // landed in the same render. A failure leaving clears its message, so the
  // same file failing again is said again.
  const [settled, setSettled] = useState(uploads)
  if (settled !== uploads) {
    setSettled(uploads)
    const turned = (to: string) =>
      [...uploads]
        .filter(
          ([file, { status }]) =>
            status === to && settled.get(file)?.status !== to
        )
        .map(([file]) => file.name)
        .join(', ')
    const landed = turned('done')
    const failed = turned('error')
    if (failed) raise(`${failed} couldn't upload. Retry is available.`)
    else if (
      [...settled].some(
        ([file, { status }]) =>
          status === 'error' && uploads.get(file)?.status !== 'error'
      )
    )
      raise('')
    const done = [...uploads.values()].filter(
      ({ status }) => status === 'done'
    ).length
    if (landed)
      say(
        `${landed} uploaded.${uploads.size > 1 ? ` ${done} of ${uploads.size} uploaded.` : ''}`
      )
  }

  const patch = (file: File, change: Partial<Upload>) =>
    setUploads((map) => {
      const was = map.get(file)
      return was ? promote(new Map(map).set(file, { ...was, ...change })) : map
    })

  const controllers = useRef(new Map<File, AbortController>())
  const start = useEffectEvent((file: File) => {
    if (!onUpload) return
    const controller = new AbortController()
    const { signal } = controller
    controllers.current.set(file, controller)
    // Run after this effect, so a throw inside rejects like a failed upload.
    Promise.resolve()
      .then(() =>
        onUpload(file, {
          signal,
          onProgress: (progress) =>
            signal.aborted ||
            patch(file, { progress: Math.min(Math.max(progress, 0), 1) })
        })
      )
      .then(
        (result) => {
          if (signal.aborted) return
          controllers.current.delete(file)
          patch(file, { status: 'done', progress: 1, result })
        },
        (error: unknown) => {
          if (signal.aborted) return
          controllers.current.delete(file)
          patch(file, { status: 'error', error })
        }
      )
  })

  useEffect(() => {
    // A file that left the value stops uploading.
    for (const [file, controller] of controllers.current)
      if (!uploads.has(file)) {
        controller.abort()
        controllers.current.delete(file)
      }
    for (const [file, { status }] of uploads)
      if (status === 'uploading' && !controllers.current.has(file)) start(file)
  }, [uploads])

  useEffect(() => {
    const running = controllers.current
    return () => {
      running.forEach((controller) => controller.abort())
      // Shown again, as from a hidden Activity, the uploads start over.
      running.clear()
    }
  }, [])

  const syncInput = useCallback(() => {
    const input = inputRef.current
    // jsdom has no DataTransfer.
    if (!input || typeof DataTransfer === 'undefined') return
    const transfer = new DataTransfer()
    for (const file of files) transfer.items.add(file)
    input.files = transfer.files
  }, [files])
  useEffect(syncInput, [syncInput])

  // Picks, drops and pastes all come through here. With one file allowed,
  // the first replaces it; with more, files join until the field is full.
  // `epoch` moves on a single pick, Clear, Remove or reorder, and a check
  // still running from before it is dropped.
  const epoch = useRef(0)
  const latest = useRef(files)
  // After every render, so a controlled value the parent didn't take is
  // read back too.
  useEffect(() => {
    latest.current = files
  })

  function take(picked: ArrayLike<File>) {
    const single = maxFiles === 1
    if (single) {
      epoch.current++
      setChecking([])
    }
    const at = epoch.current
    const rejections: FileUploadRejection[] = []
    const checked = Array.from(picked)
      .slice(0, single ? 1 : undefined)
      .filter((file) => {
        const rejection = checkFile(file, { accept, maxFileSize, minFileSize })
        if (rejection) rejections.push(rejection)
        return !rejection
      })
    // `shown` are this pick's rejections already reported, kept in the message.
    const report = (
      turnedAway: FileUploadRejection[],
      shown: FileUploadRejection[] = []
    ) => {
      if (!turnedAway.length) return
      setError(
        [...shown, ...turnedAway].map(({ message }) => message).join(' ')
      )
      onReject?.(turnedAway)
    }
    // Counts the field's files as they are when the checks land.
    const land = (
      passed: File[],
      turnedAway: FileUploadRejection[],
      shown: FileUploadRejection[] = []
    ) => {
      const current = single ? [] : latest.current
      const taken = passed.slice(0, Math.max(maxFiles - current.length, 0))
      if (taken.length) update([...current, ...taken], shown.length > 0)
      report(
        [
          ...turnedAway,
          ...passed.slice(taken.length).map((file) => ({
            file,
            code: 'too-many' as const,
            message: `${file.name} wasn't added, as the field takes up to ${maxFiles} files.`
          }))
        ],
        shown
      )
    }
    if (!validate || !checked.length) land(checked, rejections)
    else {
      // The rules' rejections show while the rest are checked.
      report(rejections)
      setChecking((files) => [...files, ...checked])
      say(
        `Checking ${checked.length > 1 ? `${checked.length} files` : checked[0]!.name}.`
      )
      Promise.all(
        checked.map((file) =>
          Promise.resolve()
            .then(() => validate(file))
            .catch(() => `${file.name} couldn't be checked. Try another file.`)
        )
      ).then((messages) => {
        setChecking((files) => files.filter((file) => !checked.includes(file)))
        if (at !== epoch.current) return
        land(
          checked.filter((_, index) => !messages[index]),
          checked.flatMap((file, index) => {
            const message = messages[index]
            return message ? [{ file, code: 'invalid' as const, message }] : []
          }),
          rejections
        )
      })
    }
    // The input shows only the value; an accepted pick reaches it on re-render.
    syncInput()
  }

  function update(next: File[], keepError = false) {
    latest.current = next
    if (!keepError) setError(null)
    setUncontrolled(next)
    onValueChange?.(next)
  }

  function commit(next: File[], keepError = false) {
    epoch.current++
    // Checks still running are dropped when they land.
    setChecking([])
    update(next, keepError)
  }

  const isDisabled = Boolean(disabled || field.disabled)
  const full = maxFiles > 1 && files.length >= maxFiles
  const invalid = Boolean(field.invalid) || error !== null
  const describedBy = invalid ? field.errorTextId : field.helperTextId

  return (
    <div
      data-slot='file-upload'
      data-disabled={isDisabled || undefined}
      data-invalid={invalid || undefined}
      data-full={full || undefined}
      data-checking={checking.length > 0 || undefined}
      className={cn('grid justify-items-start gap-2', className)}
      onPaste={(event) => {
        onPaste?.(event)
        const pasted = event.clipboardData.files
        const target = event.target as HTMLElement
        // A text field inside keeps its paste, such as cells copied with an image.
        const editable =
          target.isContentEditable || target.matches('input, textarea')
        if (event.defaultPrevented || isDisabled || editable || !pasted.length)
          return
        event.preventDefault()
        take(pasted)
      }}
      {...props}
    >
      <FileUploadContext
        value={{
          files,
          take,
          open: () => {
            if (!full) inputRef.current?.click()
          },
          clear: () => {
            commit([])
            triggerRef.current?.focus()
          },
          remove: (file) => commit(files.filter((each) => each !== file)),
          // A reorder leaves any rejection showing.
          reorder: (next) => commit(next, true),
          maxFiles,
          full,
          checking,
          uploads,
          retry: (file) =>
            patch(file, { status: 'queued', progress: 0, error: undefined }),
          inputId,
          valueId: `${ownId}-value`,
          triggerRef,
          disabled: isDisabled,
          invalid,
          labelId: field.labelId || undefined,
          describedBy: describedBy || undefined
        }}
      >
        {pageDrop && <FileUploadPageDrop accept={accept} />}
        {children ?? (
          <>
            <FileUploadDropzone />
            <FileUploadList />
          </>
        )}
      </FileUploadContext>
      <input
        ref={inputRef}
        type='file'
        id={inputId}
        name={name}
        accept={accept}
        multiple={maxFiles > 1}
        capture={capture}
        required={Boolean(required || field.required)}
        disabled={isDisabled}
        tabIndex={-1}
        aria-hidden
        className='sr-only'
        onChange={(event) => take(event.currentTarget.files ?? [])}
        // The browser focuses an empty required input when a form submits.
        onFocus={() => triggerRef.current?.focus()}
      />
      <p role='status' className='sr-only'>
        {said}
      </p>
      <p aria-live='assertive' className='sr-only'>
        {alarm}
      </p>
    </div>
  )
}

FileUploadRoot.displayName = 'FileUpload.Root'
