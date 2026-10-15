import { Image } from '@/components/Image'

import { Logo } from '@oztix/roadie-components/logo'
import { Mark } from '@oztix/roadie-components/mark'
import { Pattern } from '@oztix/roadie-components/pattern'
import { Hand, Heart } from '@oztix/roadie-components/spot-illustrations'

const HOUSE_INTENTS = [
  'intent-brand-blue',
  'intent-brand-purple',
  'intent-brand-orange'
]

/** A brand page's preview art, authored at roughly `w-40` for `PreviewThumbnail`. */
export function BrandPreview({ name }: { name: string }) {
  switch (name) {
    case 'colour':
      return (
        <div className='grid w-40 gap-1'>
          {['emphasis-strong', 'emphasis-subtle'].map((emphasis) => (
            <div key={emphasis} className='grid grid-cols-3 gap-1'>
              {HOUSE_INTENTS.map((intent) => (
                <div
                  key={intent}
                  className={`h-8 rounded-sm ${intent} ${emphasis}`}
                />
              ))}
            </div>
          ))}
        </div>
      )
    case 'typography':
      return (
        <div className='grid w-40 justify-items-start gap-1'>
          <p className='text-4xl leading-none font-black text-strong'>Aa</p>
          <p className='text-sm font-bold text-strong'>
            <Mark intent='brand-blue'>Built on Partnerships</Mark>
          </p>
        </div>
      )
    case 'logo':
      return <Logo size='lg' aria-hidden />
    case 'pattern':
      return <Pattern crop='banner' className='h-11 w-40 rounded-md' />
    case 'illustration':
      return (
        <div className='flex gap-2'>
          <Heart className='size-14' />
          <Hand className='size-14' />
        </div>
      )
    case 'photography':
      return (
        // PreviewThumbnail scales art down to 0.8 and 0.9 at its smaller
        // sizes; scaling back up lets the photo cover the whole tile.
        <span className='block w-[100cqw] scale-125 @[11rem]:scale-[1.112] @[13rem]:scale-100'>
          <Image
            src='/brand/photography/10.webp'
            width={640}
            height={417}
            alt=''
            className='aspect-4/3 w-full object-cover'
          />
        </span>
      )
    default:
      return null
  }
}
