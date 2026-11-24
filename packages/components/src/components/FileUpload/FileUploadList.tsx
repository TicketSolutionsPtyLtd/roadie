'use client'

import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

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
 * collapsed, so the rows under it slide up rather than jump.
 */
export function FileUploadList({
  children = defaultItem,
  className,
  ...props
}: FileUploadListProps) {
  const { files } = useFileUploadContext('FileUpload.List')
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
  return (
    <ul
      data-slot='file-upload-list'
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
}

FileUploadList.displayName = 'FileUpload.List'
