import { getFamilyTokens } from '@/lib/tokens'

const INSET = '--inset-shadow-'

/** The shadow tokens, drop or inset, each on a tile that wears it. */
export async function ShadowScale({ inset = false }: { inset?: boolean }) {
  const shadows = (await getFamilyTokens('elevation')).filter(
    ({ group, kind, name }) =>
      group === 'Shadows' &&
      kind === 'variable' &&
      name.startsWith(INSET) === inset
  )

  return (
    <div
      data-not-prose
      data-slot={inset ? 'inset-shadow-scale' : 'shadow-scale'}
      className='@container'
    >
      <ul className='grid grid-cols-2 gap-x-4 gap-y-6 @md:grid-cols-3'>
        {shadows.map(({ name }) => (
          <li key={name} className='grid gap-2'>
            <div
              data-slot='shadow-swatch'
              className={`h-20 rounded-xl ${inset ? 'bg-normal' : 'bg-raised'}`}
              // A class built from data never reaches Tailwind, so the swatch reads the token.
              style={{ boxShadow: `var(${name})` }}
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
