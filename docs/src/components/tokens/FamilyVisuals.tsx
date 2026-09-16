import type { TokenEntry } from '@/lib/tokens'

const SCALES = [
  'neutral',
  'brand',
  'brand-secondary',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
]

const INTENTS = [
  'neutral',
  'brand',
  'brand-secondary',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
]

const STEPS = Array.from({ length: 14 }, (_, step) => step)

const sentence = (text: string) =>
  text[0]!.toUpperCase() + text.slice(1).replace(/-/g, ' ')

/** Every scale's 14 steps, live in the current theme. */
export function ScaleGrid() {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[30rem] table-fixed border-separate border-spacing-0.5 text-xs'>
        <caption className='sr-only'>Color scales by step</caption>
        <thead>
          <tr>
            <th
              scope='col'
              className='w-28 text-start font-normal text-subtler'
            >
              <span className='sr-only'>Scale</span>
            </th>
            {STEPS.map((step) => (
              <th key={step} scope='col' className='font-normal text-subtler'>
                {step}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCALES.map((scale) => (
            <tr key={scale}>
              <th
                scope='row'
                className='pe-2 text-start font-normal whitespace-nowrap text-subtle'
              >
                {sentence(scale)}
              </th>
              {STEPS.map((step) => (
                <td
                  key={step}
                  title={`--color-${scale}-${step}`}
                  className='h-7 rounded-sm'
                  style={{ backgroundColor: `var(--color-${scale}-${step})` }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ROLE_GROUPS = ['Backgrounds', 'Borders', 'Text']

function RoleSample({ name, group }: { name: string; group: string }) {
  if (group === 'Text')
    return (
      <span
        className='block text-center text-base font-bold'
        style={{ color: `var(${name})` }}
      >
        Aa
      </span>
    )
  return group === 'Borders' ? (
    <span
      className='block h-7 rounded-md border-2'
      style={{ borderColor: `var(${name})` }}
    />
  ) : (
    <span
      className='block h-7 rounded-md border border-subtler'
      style={{ backgroundColor: `var(${name})` }}
    />
  )
}

/** Every semantic role in the manifest, resolved under every intent. */
export function IntentMatrix({ roles }: { roles: TokenEntry[] }) {
  return (
    <figure className='grid gap-2'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[30rem] table-fixed border-separate border-spacing-1 text-xs'>
          <thead>
            <tr>
              <th
                scope='col'
                className='w-28 text-start font-normal text-subtler'
              >
                <span className='sr-only'>Role</span>
              </th>
              {INTENTS.map((intent) => (
                <th
                  key={intent}
                  scope='col'
                  className='font-normal text-subtle'
                >
                  {sentence(intent)}
                </th>
              ))}
            </tr>
          </thead>
          {ROLE_GROUPS.map((group) => (
            <tbody key={group}>
              <tr>
                <th
                  scope='rowgroup'
                  colSpan={INTENTS.length + 1}
                  className='pt-3 text-start text-sm font-semibold text-strong'
                >
                  {group}
                </th>
              </tr>
              {roles
                .filter((role) => role.group === group)
                .map(({ name }) => (
                  <tr key={name}>
                    <th
                      scope='row'
                      className='pe-2 text-start font-mono font-normal whitespace-nowrap text-subtle'
                    >
                      {name.replace('--intent-', '')}
                    </th>
                    {INTENTS.map((intent) => (
                      <td key={intent} className={`intent-${intent}`}>
                        <RoleSample name={name} group={group} />
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          ))}
        </table>
      </div>
      <figcaption className='text-sm text-subtle'>
        Every intent sets the same roles, so any role works under any intent.
      </figcaption>
    </figure>
  )
}

const PRESETS = [
  'emphasis-strong',
  'emphasis-normal',
  'emphasis-subtle',
  'emphasis-subtler',
  'emphasis-inverted',
  'emphasis-raised',
  'emphasis-floating',
  'emphasis-sunken',
  'emphasis-field',
  'emphasis-overlay'
]

/** Every emphasis preset side by side. */
export function EmphasisGrid() {
  return (
    <ul className='grid grid-cols-2 gap-3 rounded-xl bg-subtle p-4 @md:grid-cols-3'>
      {PRESETS.map((preset) => (
        <li key={preset} className='grid'>
          <span
            className={`grid min-h-14 place-content-center rounded-lg px-2 font-mono text-xs ${preset}`}
          >
            {preset.replace('emphasis-', '')}
          </span>
        </li>
      ))}
    </ul>
  )
}
