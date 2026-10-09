import { type TokenEntry, getFamilyTokens } from '@/lib/tokens'

const TRANSITION = '--interactive-transition'

const variable = (reference: string) =>
  /^var\((--[\w-]+)\)$/.exec(reference)?.[1]

function valueOf(tokens: TokenEntry[], name: string) {
  const value = tokens.find((token) => token.name === name)?.value?.light
  if (!value) throw new Error(`No ${name} token in the manifest.`)
  return value
}

/** Each property `is-interactive` animates, with its duration and easing tokens. */
export async function TransitionList() {
  const motion = await getFamilyTokens('motion')
  const transitions = valueOf(motion, TRANSITION)
    .split(',')
    .map((part) => {
      const [property, duration, easing] = part.trim().split(/\s+/)
      const durationName = variable(duration ?? '')
      const easingName = variable(easing ?? '')
      if (!property || !durationName || !easingName)
        throw new Error(`Can't read "${part.trim()}" in ${TRANSITION}.`)
      return {
        property,
        duration: valueOf(motion, durationName),
        easing: easingName.slice(2)
      }
    })

  return (
    <ol
      data-not-prose
      data-slot='transition-list'
      className='grid grid-cols-[auto_auto_minmax(0,1fr)] divide-y divide-subtler'
    >
      {transitions.map(({ property, duration, easing }) => (
        <li
          key={property}
          data-slot='transition-row'
          className='col-span-full grid grid-cols-subgrid items-baseline gap-4 py-2'
        >
          <code className='font-mono text-sm text-strong'>{property}</code>
          <span
            data-slot='transition-duration'
            className='font-mono text-sm text-subtle tabular-nums'
          >
            {duration}
          </span>
          <code
            data-slot='transition-easing'
            className='font-mono text-sm text-subtle'
          >
            {easing}
          </code>
        </li>
      ))}
    </ol>
  )
}
