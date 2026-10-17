import { FlowerSpiral, Hand } from '@oztix/roadie-components/spot-illustrations'

import { Skel } from './ComponentSkeleton'

/** A Content page's preview art, authored at roughly `w-40` for `PreviewThumbnail`. */
export function ContentPreview({ name }: { name: string }) {
  switch (name) {
    case 'voice-and-tone':
      return <Hand className='size-20' />
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
      return <FlowerSpiral className='size-20' />
    case 'interface-copy':
      return (
        <p className='emphasis-strong rounded-lg px-4 py-2 text-sm intent-accent'>
          Save changes
        </p>
      )
    default:
      return null
  }
}
