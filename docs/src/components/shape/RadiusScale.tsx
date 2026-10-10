import { radii } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

/** Each radius tier as a tile with its class and value, then `rounded-full`. */
export async function RadiusScale() {
  return (
    <div data-not-prose data-slot='radius-scale' className='@container'>
      <ul className='grid grid-cols-2 gap-x-4 gap-y-6 @md:grid-cols-3 @3xl:grid-cols-4'>
        {radii(await getTokens()).map(({ utility, rem, label }) => (
          <li key={utility} data-twin-row className='grid gap-2'>
            <div
              data-slot='radius-swatch'
              className={`aspect-square border border-subtle bg-raised ${rem ? '' : 'rounded-full'}`}
              // A class built from data never reaches Tailwind, so the swatch uses the value.
              style={rem ? { borderRadius: rem } : undefined}
            />
            <div className='grid'>
              <code data-twin-cell className='font-mono text-sm text-strong'>
                {utility}
              </code>
              <p data-twin-cell className='text-xs text-subtle'>
                {label}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
