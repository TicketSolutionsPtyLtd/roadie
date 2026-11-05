import { MovedEditorSections } from '@/components/editor/MovedEditorSections'

export default function EditorLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <MovedEditorSections />
      {children}
    </>
  )
}
