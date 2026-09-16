import type { TokenFamily } from '@roadie-core/tokens'

const SCALES = ['neutral', 'brand', 'accent', 'danger', 'success', 'info']
const STEPS = [2, 4, 6, 8, 9, 11]

/** A family's card art, authored at roughly `w-40` for `PreviewThumbnail`. */
export function TokenFamilyArt({ family }: { family: TokenFamily }) {
  switch (family) {
    case 'color-scales':
      return (
        <div className='grid w-40 gap-0.5'>
          {SCALES.map((scale) => (
            <div key={scale} className='grid grid-cols-6 gap-0.5'>
              {STEPS.map((step) => (
                <span
                  key={step}
                  className='h-3 rounded-xs'
                  style={{ backgroundColor: `var(--color-${scale}-${step})` }}
                />
              ))}
            </div>
          ))}
        </div>
      )
    case 'intents':
      return (
        <div className='grid w-40 grid-cols-3 gap-1.5'>
          {['intent-accent', 'intent-danger', 'intent-success'].map(
            (intent) => (
              <div key={intent} className={`grid gap-1 ${intent}`}>
                <span className='h-6 rounded-md bg-strong' />
                <span className='h-4 rounded-md bg-subtle' />
                <span className='h-4 rounded-md border border-normal' />
              </div>
            )
          )}
        </div>
      )
    case 'emphasis':
      return (
        <div className='grid w-40 grid-cols-2 gap-1.5 intent-accent'>
          {[
            'emphasis-strong',
            'emphasis-normal',
            'emphasis-subtle',
            'emphasis-raised'
          ].map((emphasis) => (
            <span key={emphasis} className={`h-7 rounded-full ${emphasis}`} />
          ))}
        </div>
      )
    case 'typography':
      return (
        <div className='grid w-40 gap-1'>
          <span className='text-3xl leading-none font-bold text-strong'>
            Aa
          </span>
          <span className='h-2 w-32 rounded-full bg-strong/20' />
          <span className='h-2 w-24 rounded-full bg-strong/20' />
        </div>
      )
    case 'elevation':
      return (
        <div className='flex w-40 items-end justify-center gap-2'>
          {['shadow-xs', 'shadow-md', 'shadow-xl'].map((shadow) => (
            <span
              key={shadow}
              className={`size-10 rounded-lg bg-raised ${shadow}`}
            />
          ))}
        </div>
      )
    case 'shape':
      return (
        <div className='flex w-40 items-end justify-center gap-2'>
          {['rounded-md', 'rounded-xl', 'rounded-5xl'].map((radius) => (
            <span
              key={radius}
              className={`size-10 border-s-2 border-t-2 border-strong bg-raised ${radius}`}
            />
          ))}
        </div>
      )
    case 'motion':
      return (
        <div className='grid w-40 gap-1.5'>
          {['ms-0', 'ms-12', 'ms-20', 'ms-24'].map((offset) => (
            <span
              key={offset}
              className={`size-3 rounded-full bg-strong ${offset}`}
            />
          ))}
        </div>
      )
    case 'component-utilities':
      return (
        <div className='flex w-40 items-center justify-center gap-2 intent-accent'>
          <span className='btn btn-sm emphasis-strong'>Buy</span>
          <span
            aria-hidden
            className='calendar-tile calendar-tile-sm emphasis-subtle'
          >
            <span className='calendar-tile-top'>Nov</span>
            <span className='calendar-tile-day'>27</span>
          </span>
        </div>
      )
  }
}
