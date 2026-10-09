import { getFamilyTokens } from '@/lib/tokens'

const COLOUR_PRESETS = [
  'emphasis-strong',
  'emphasis-normal',
  'emphasis-subtle',
  'emphasis-subtler'
]

/** Every intent utility, each wearing the four colour emphasis presets. */
export async function IntentEmphasis() {
  const intents = (await getFamilyTokens('intents')).filter(
    ({ group }) => group === 'Intent utilities'
  )
  const presets = (await getFamilyTokens('emphasis')).filter(({ name }) =>
    COLOUR_PRESETS.includes(name)
  )

  return (
    <ul data-not-prose data-slot='intent-emphasis' className='grid gap-4'>
      {intents.map(({ name: intent }) => (
        <li
          key={intent}
          data-intent={intent}
          className={`${intent} grid gap-2`}
        >
          <code className='font-mono text-sm text-strong'>{intent}</code>
          <ul className='grid grid-cols-4 gap-2'>
            {presets.map(({ name: preset }) => (
              <li
                key={preset}
                data-slot='intent-sample'
                data-emphasis={preset}
                className={`${preset} rounded-md px-2 py-1.5 text-center text-sm`}
              >
                {preset.replace('emphasis-', '')}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
