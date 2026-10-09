import { getFamilyTokens } from '@/lib/tokens'

const LABELS: Record<string, string> = {
  '--focus-ring-width': 'Width',
  '--focus-ring-opacity': 'Opacity in light mode',
  '--focus-ring-opacity-dark': 'Opacity in dark mode'
}

/** The focus ring tokens, each with what it sets and its value. */
export async function FocusRingList() {
  const tokens = (await getFamilyTokens('emphasis')).filter(
    ({ group }) => group === 'Focus ring'
  )
  for (const name of Object.keys(LABELS)) {
    if (!tokens.some((token) => token.name === name))
      throw new Error(`No ${name} token in the manifest.`)
  }

  return (
    <dl
      data-not-prose
      data-slot='focus-ring-list'
      className='grid divide-y divide-subtler'
    >
      {tokens.map(({ name, value }) => (
        <div
          key={name}
          data-slot='focus-ring-row'
          data-token={name}
          className='grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-2'
        >
          <dt className='grid gap-0.5'>
            <span className='text-sm text-strong'>{LABELS[name] ?? name}</span>
            <code className='font-mono text-xs text-subtle'>{name}</code>
          </dt>
          <dd
            data-slot='focus-ring-value'
            className='font-mono text-sm text-subtle tabular-nums'
          >
            {value?.light}
          </dd>
        </div>
      ))}
    </dl>
  )
}
