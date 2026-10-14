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
    default:
      return null
  }
}
