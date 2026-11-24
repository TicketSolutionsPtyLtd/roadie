'use client'

import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { SortableRootContext } from '../Sortable/SortableContext'
import { SortableRoot } from '../Sortable/SortableRoot'
import {
  FileUploadItemContext,
  type FileUploadItem as Item,
  useFileUploadContext
} from './FileUploadContext'
import {
  FileUploadItem,
  FileUploadItemName,
  FileUploadItemRemove,
  FileUploadItemRetry,
  FileUploadItemSize,
  FileUploadItemStatus
} from './FileUploadItem'
import { FileUploadItemPreview } from './FileUploadItemPreview'

export type FileUploadListProps = Omit<ComponentProps<'ul'>, 'children'> & {
  /** Renders each file. Defaults to a row with its preview, name, size and Remove. */
  children?: (item: Item) => ReactNode
}

const ids = new WeakMap<File, string>()
let count = 0
const idFor = (file: File) => {
  let id = ids.get(file)
  if (!id) ids.set(file, (id = `file-${++count}`))
  return id
}

type Leaving = {
  file: File
  /** The row it sat under, or null when it was first. */
  after: File | null
  /** Its place when it left, in case the row above has gone too. */
  index: number
}

/** The files' rows, with each collapsing row back under the row it left from. */
function layRows(files: File[], leaving: Leaving[]) {
  const rows = files.map((file) => ({ file, leaving: false }))
  const pending = [...leaving]
  while (pending.length) {
    // A row whose row above is collapsing too goes in after that one, so it
    // finds it.
    const next = pending.findIndex(
      ({ after }) => !pending.some(({ file }) => file === after)
    )
    const { file, after, index } = pending.splice(Math.max(next, 0), 1)[0]!
    const above = rows.findIndex((row) => row.file === after)
    const at =
      after === null
        ? 0
        : above === -1
          ? Math.min(index, rows.length)
          : above + 1
    rows.splice(at, 0, { file, leaving: true })
  }
  return rows
}

const defaultItem = ({ status }: Item) => (
  <FileUploadItem>
    <FileUploadItemPreview>
      <FileUploadItemStatus />
    </FileUploadItemPreview>
    <span className='grid min-w-0 flex-1'>
      <FileUploadItemName />
      {status === 'error' ? (
        <span className='text-sm text-subtle'>
          This file couldn't upload. Try again.
        </span>
      ) : (
        <FileUploadItemSize />
      )}
    </span>
    <FileUploadItemRetry />
    <FileUploadItemRemove />
  </FileUploadItem>
)

/**
 * The chosen files, one row each, called with each file and its upload. A
 * removed row stays until it has collapsed, so the rows under it slide up
 * rather than jump. When the field takes more than one file, each
 * `FileUpload.Item` leads with a handle that drags it, or opens a Move menu.
 */
export function FileUploadList({
  children = defaultItem,
  className,
  ...props
}: FileUploadListProps) {
  const { files, uploads, maxFiles, reorder, labelId } =
    useFileUploadContext('FileUpload.List')
  const [previous, setPrevious] = useState(files)
  // The files that arrived together, so each pops in after the one before.
  const [added, setAdded] = useState(files)
  const [leaving, setLeaving] = useState<Leaving[]>([])
  if (previous !== files) {
    setPrevious(files)
    setAdded(files.filter((file) => !previous.includes(file)))
    // Each removed row remembers the row it sat under, so it stays there
    // through a reorder.
    const shown = layRows(previous, leaving)
    setLeaving([
      ...leaving.filter(({ file }) => !files.includes(file)),
      ...shown.flatMap((row, index) =>
        row.leaving || files.includes(row.file)
          ? []
          : [{ file: row.file, after: shown[index - 1]?.file ?? null, index }]
      )
    ])
  }

  // Rows a `FileUpload.Item` animates out. Any other markup goes at once.
  const claimed = useRef(new Set<string>())
  useEffect(() => {
    if (leaving.some(({ file }) => !claimed.current.has(idFor(file))))
      setLeaving((rows) =>
        rows.filter(({ file }) => claimed.current.has(idFor(file)))
      )
  }, [leaving])

  const rows = layRows(files, leaving)

  if (!rows.length) return null
  const list = (
    <ul
      data-slot='file-upload-list'
      aria-labelledby={labelId}
      className={cn('grid w-full justify-self-stretch', className)}
      {...props}
    >
      {rows.map(({ file, leaving }) => {
        const item: Item = {
          status: 'idle',
          progress: 0,
          ...uploads.get(file),
          file,
          id: idFor(file)
        }
        return (
          <FileUploadItemContext
            key={item.id}
            value={{
              item,
              leaving,
              enterIndex: Math.max(added.indexOf(file), 0),
              onLeft: () =>
                setLeaving((rows) => rows.filter((row) => row.file !== file)),
              claim: (id) => claimed.current.add(id)
            }}
          >
            {children(item)}
          </FileUploadItemContext>
        )
      })}
    </ul>
  )
  // Cleared, so a Sortable around the field doesn't make its rows its own.
  if (maxFiles < 2)
    return <SortableRootContext value={null}>{list}</SortableRootContext>
  // Collapsing rows stay Sortable items, disabled, so their element never
  // remounts, but they're left out of `items`, so the Move menu doesn't
  // count them.
  return (
    <SortableRoot
      items={files.map(idFor)}
      label='files'
      onReorder={(next) =>
        reorder(
          next.flatMap((id) => {
            const file = files[files.map(idFor).indexOf(id)]
            return file ? [file] : []
          })
        )
      }
    >
      {list}
    </SortableRoot>
  )
}

FileUploadList.displayName = 'FileUpload.List'
