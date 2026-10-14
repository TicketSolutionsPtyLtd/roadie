/** A Content page's preview art, authored at roughly `w-40` for `PreviewThumbnail`. */
export function ContentPreview({ name }: { name: string }) {
  switch (name) {
    case 'voice-and-tone':
      return (
        <div className='grid w-44 gap-2'>
          <p className='justify-self-start rounded-xl emphasis-subtle px-3 py-1.5 text-xs text-strong'>
            The scanner is slow.
          </p>
          <p className='emphasis-strong justify-self-end rounded-xl px-3 py-1.5 text-xs intent-accent'>
            We’re fixing it now.
          </p>
        </div>
      )
    default:
      return null
  }
}
