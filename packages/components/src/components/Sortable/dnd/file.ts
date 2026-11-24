// The drag library's file drops, kept apart from index.ts so a file field
// doesn't bundle the sorting code. Framework-free, like index.ts.
import { dropTargetForExternal } from '@atlaskit/pragmatic-drag-and-drop/external/adapter'
import {
  containsFiles,
  getFiles
} from '@atlaskit/pragmatic-drag-and-drop/external/file'

export type FileDropTargetOptions = {
  element: HTMLElement
  /** True while files from outside the page are over the element. */
  onDragChange: (over: boolean) => void
  onDrop: (files: File[]) => void
}

/** Takes files dragged in from outside the page, such as from the desktop. */
export function fileDropTarget({
  element,
  onDragChange,
  onDrop
}: FileDropTargetOptions): () => void {
  return dropTargetForExternal({
    element,
    canDrop: containsFiles,
    onDragEnter: () => onDragChange(true),
    onDragLeave: () => onDragChange(false),
    onDrop: ({ source }) => {
      onDragChange(false)
      onDrop(getFiles({ source }))
    }
  })
}

export type FilePageTargetOptions = {
  /**
   * Called as files cross the page with each one's MIME type, all that's
   * known before the drop, then with null once they leave, land, or move
   * over a nearer file target.
   */
  onDragChange: (types: string[] | null) => void
  onDrop: (files: File[]) => void
}

/**
 * Takes files dropped anywhere on the page, except on a nearer file target
 * such as a dropzone, which takes them itself.
 */
export function filePageTarget({
  onDragChange,
  onDrop
}: FilePageTargetOptions): () => void {
  const element = document.documentElement
  type Args = {
    location: { current: { dropTargets: { element: Element }[] } }
  }
  const nearest = ({ location }: Args) =>
    location.current.dropTargets[0]?.element === element
  // The library hides the items until the drop, so read each file's type
  // from the events, which come here first.
  let types: string[] = []
  const read = (event: DragEvent) => {
    types = Array.from(event.dataTransfer?.items ?? [])
      .filter(({ kind }) => kind === 'file')
      .map(({ type }) => type)
  }
  const change = (args: Args) => onDragChange(nearest(args) ? types : null)
  const events = ['dragenter', 'dragover'] as const
  for (const type of events) window.addEventListener(type, read, true)
  const cleanup = dropTargetForExternal({
    element,
    canDrop: containsFiles,
    onDragEnter: change,
    onDropTargetChange: change,
    onDragLeave: () => onDragChange(null),
    onDrop: (args) => {
      onDragChange(null)
      if (nearest(args)) onDrop(getFiles(args))
    }
  })
  return () => {
    for (const type of events) window.removeEventListener(type, read, true)
    cleanup()
  }
}
