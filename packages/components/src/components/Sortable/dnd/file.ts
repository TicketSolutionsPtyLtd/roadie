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
