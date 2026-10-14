import { Logo } from '@oztix/roadie-components/logo'
import { Mark } from '@oztix/roadie-components/mark'

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
            <div key={emphasis} className='flex gap-1'>
              {HOUSE_INTENTS.map((intent) => (
                <div
                  key={intent}
                  className={`h-8 flex-1 rounded-sm ${intent} ${emphasis}`}
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
    default:
      return null
  }
}
