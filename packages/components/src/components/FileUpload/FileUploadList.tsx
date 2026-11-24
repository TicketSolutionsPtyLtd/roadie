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
  FileUploadItemSize
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

const defaultItem = () => (
  <FileUploadItem>
    <FileUploadItemPreview />
    <span className='grid min-w-0 flex-1'>
      <FileUploadItemName />
      <FileUploadItemSize />
    </span>
    <FileUploadItemRemove />
  </FileUploadItem>
)

/**
 * The chosen files, one row each. A removed row stays until it has
 * collapsed, so the rows under it slide up rather than jump. When the field
 * takes more than one file, each `FileUpload.Item` leads with a handle that
 * drags it, or opens a Move menu.
 */
export function FileUploadList({
  children = defaultItem,
  className,
  ...props
}: FileUploadListProps) {
  const { files, maxFiles, reorder, labelId } =
    useFileUploadContext('FileUpload.List')
  const [previous, setPrevious] = useState(files)
  // The files that arrived together, so each pops in after the one before.
  const [added, setAdded] = useState(files)
  const [leaving, setLeaving] = useState<{ file: File; index: number }[]>([])
  if (previous !== files) {
    setPrevious(files)
    setAdded(files.filter((file) => !previous.includes(file)))
    setLeaving((rows) => [
      ...rows.filter(({ file }) => !files.includes(file)),
      ...previous.flatMap((file, index) =>
        files.includes(file) ? [] : [{ file, index }]
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

  const rows = files.map((file) => ({ file, leaving: false }))
  for (const { file, index } of leaving)
    rows.splice(Math.min(index, rows.length), 0, { file, leaving: true })

  if (!rows.length) return null
  const list = (
    <ul
      data-slot='file-upload-list'
      aria-labelledby={labelId}
      className={cn('grid w-full justify-self-stretch', className)}
      {...props}
    >
      {rows.map(({ file, leaving }) => {
        const item = { file, id: idFor(file) }
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
  // Collapsing rows stay listed, disabled, so their element never remounts.
  const ids = rows.map(({ file }) => idFor(file))
  return (
    <SortableRoot
      items={ids}
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
