const WEIGHTS = [
  { name: 'Black', className: 'font-black', weight: '900' },
  { name: 'Bold', className: 'font-bold', weight: '700' },
  { name: 'Medium', className: 'font-medium', weight: '500' },
  { name: 'Regular', className: 'font-normal', weight: '400' }
]

/** Intermission at display size, with the four brand weights. */
export function TypeSpecimen() {
  return (
    <div data-not-prose data-slot='type-specimen' className='@container'>
      <div className='grid emphasis-raised gap-6 rounded-2xl p-6 @md:p-10'>
        <div className='grid gap-2 @lg:grid-cols-[auto_1fr] @lg:items-end @lg:gap-8'>
          <p className='text-7xl leading-none font-black tracking-display text-strong'>
            Aa
          </p>
          <div className='grid gap-1'>
            <p className='text-display-ui-4 text-strong'>Intermission</p>
            <p className='text-subtle'>
              ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
            </p>
          </div>
        </div>
        <ul className='grid grid-cols-2 gap-4 @lg:grid-cols-4'>
          {WEIGHTS.map(({ name, className, weight }) => (
            <li key={name} className='grid gap-1 border-t border-subtle pt-3'>
              <span className={`text-2xl text-strong ${className}`}>
                {name}
              </span>
              <span className='text-sm text-subtler'>{weight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
