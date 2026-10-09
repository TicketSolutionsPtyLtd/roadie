import { getFamilyTokens } from '@/lib/tokens'

// The alias of the normal level, and the strong level's highlight as a bare colour.
const NOT_LEVELS = ['--rim-light', '--rim-light-edge']

/** The rim light levels, each on a raised tile with a medium shadow. */
export async function RimLightScale() {
  const levels = (await getFamilyTokens('elevation')).filter(
    ({ group, kind, name }) =>
      group === 'Rim light' && kind === 'variable' && !NOT_LEVELS.includes(name)
  )

  return (
    <div data-not-prose data-slot='rim-light-scale' className='@container'>
      <ul className='grid grid-cols-2 gap-x-4 gap-y-6 @3xl:grid-cols-4'>
        {levels.map(({ name }) => (
          <li key={name} className='grid gap-2'>
            <div
              data-slot='rim-light-swatch'
              className='h-20 rounded-xl bg-raised'
              style={{ boxShadow: `var(${name}), var(--shadow-md)` }}
            />
            <code className='font-mono text-sm text-strong'>
              {name.slice(2)}
            </code>
          </li>
        ))}
      </ul>
    </div>
  )
}
