import { getFamilyTokens } from '@/lib/tokens'

/** The z-index tiers, top of the stack first, each with its utility and value. */
export async function LayeringScale() {
  const tiers = (await getFamilyTokens('elevation'))
    .filter(({ group, kind }) => group === 'Layering' && kind === 'variable')
    .map(({ name, value }) => ({
      utility: name.replace('--z-index-', 'z-'),
      value: value!.light!
    }))
    .sort((a, b) => Number(b.value) - Number(a.value))

  return (
    <ol
      data-not-prose
      data-slot='layering-scale'
      className='grid divide-y divide-subtler'
    >
      {tiers.map(({ utility, value }) => (
        <li
          key={utility}
          data-slot='layering-tier'
          className='grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-4 py-2'
        >
          <span className='text-end font-mono text-sm text-subtle tabular-nums'>
            {value}
          </span>
          <code className='font-mono text-sm text-strong'>{utility}</code>
        </li>
      ))}
    </ol>
  )
}
