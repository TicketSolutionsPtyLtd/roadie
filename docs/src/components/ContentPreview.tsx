import { Skel } from './ComponentSkeleton'

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
    case 'language-and-grammar':
      return (
        <div className='grid w-44 gap-1.5'>
          <p className='text-sm text-strong'>
            ID, tickets
            <span className='emphasis-strong rounded-sm px-0.5 intent-accent'>
              ,
            </span>{' '}
            and cash
          </p>
          <Skel className='h-1.5 w-full' />
          <Skel className='h-1.5 w-28' />
        </div>
      )
    case 'writing-with-ai':
      return (
        <div className='grid w-44 gap-1'>
          <p className='text-xs text-subtler line-through'>
            Certainly! I hope this helps.
          </p>
          <p className='text-sm text-strong'>Gates open at 6pm.</p>
        </div>
      )
    default:
      return null
  }
}
