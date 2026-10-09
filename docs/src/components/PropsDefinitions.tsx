import { ArrowSquareOutIcon } from '@phosphor-icons/react/ssr'

import {
  type ManifestPart,
  type ManifestProp,
  manifestComponent
} from '@/lib/manifest'

import { Badge, Code } from '@oztix/roadie-components'

// Compounds that wrap a Base UI primitive, plus the exact set of parts
// Base UI actually documents for each. Only parts present in the map
// render a link. Roadie-native sub-components (e.g. `Select.HelperText`,
// `Select.Content`, `Select.ErrorText`, `RadioGroup.Label`) intentionally
// render without a link because the corresponding anchor doesn't exist
// upstream.
//
// Anchors are whatever Base UI actually uses in its docs markup, which
// is **single-token lowercase with no separators**, e.g.
// `Select.ItemText` → `#itemtext`, `Select.ScrollUpArrow` →
// `#scrolluparrow`, `Combobox.InputGroup` → `#inputgroup`. Do NOT
// kebab-case these. Base UI renders `#item-text` as a 404 anchor.
//
// Base UI groups Radio + RadioGroup on a single page at
// `/react/components/radio`. Roadie's `RadioGroup` root maps to
// `#radiogroup` on that page, and the `RadioGroup.Item` leaf (which
// wraps Base UI's `<Radio>`) maps to `#root` (Base UI's Radio.Root
// anchor).
//
// If Base UI adds a new sub-component we care about, add it here. If
// we remove a wrapper, remove it here. The map is intentionally
// explicit so a typo or an upstream rename fails loudly in review
// rather than silently emitting a dead anchor.
type BaseUiCompound = {
  slug: string
  parts: Record<string, string>
}

const BASE_UI_COMPOUNDS: Record<string, BaseUiCompound> = {
  Autocomplete: {
    slug: 'autocomplete',
    parts: {
      Root: 'root',
      Value: 'value',
      Input: 'input',
      InputGroup: 'inputgroup',
      Trigger: 'trigger',
      Icon: 'icon',
      Clear: 'clear',
      List: 'list',
      Portal: 'portal',
      Positioner: 'positioner',
      Popup: 'popup',
      Status: 'status',
      Empty: 'empty',
      Collection: 'collection',
      Item: 'item',
      Group: 'group',
      GroupLabel: 'grouplabel'
    }
  },
  Avatar: {
    slug: 'avatar',
    parts: {
      Root: 'root',
      Image: 'image',
      Fallback: 'fallback'
    }
  },
  Button: {
    slug: 'button',
    parts: {}
  },
  Collapsible: {
    slug: 'collapsible',
    parts: {
      Root: 'root',
      Trigger: 'trigger',
      Panel: 'panel'
    }
  },
  Combobox: {
    slug: 'combobox',
    parts: {
      Root: 'root',
      Label: 'label',
      Input: 'input',
      InputGroup: 'inputgroup',
      Value: 'value',
      Chips: 'chips',
      Chip: 'chip',
      ChipRemove: 'chipremove',
      Trigger: 'trigger',
      Icon: 'icon',
      Clear: 'clear',
      List: 'list',
      Portal: 'portal',
      Positioner: 'positioner',
      Popup: 'popup',
      Status: 'status',
      Empty: 'empty',
      Collection: 'collection',
      Item: 'item',
      ItemIndicator: 'itemindicator',
      Group: 'group',
      GroupLabel: 'grouplabel'
    }
  },
  OTPField: {
    slug: 'otp-field',
    parts: {
      Root: 'root',
      Input: 'input',
      Separator: 'separator'
    }
  },
  NumberField: {
    slug: 'number-field',
    parts: {
      Root: 'root',
      Group: 'group',
      Input: 'input',
      Decrement: 'decrement',
      Increment: 'increment',
      ScrubArea: 'scrubarea',
      ScrubAreaCursor: 'scrubareacursor'
    }
  },
  Checkbox: {
    slug: 'checkbox',
    parts: { Root: 'root' }
  },
  CheckboxGroup: {
    slug: 'checkbox-group',
    parts: { Root: 'checkboxgroup' }
  },
  RadioGroup: {
    slug: 'radio',
    parts: {
      // The RadioGroup root maps to Base UI's `#radiogroup` part on the
      // shared /radio page.
      Root: 'radiogroup',
      // Roadie's RadioGroup.Item wraps Base UI's <Radio>, which is
      // documented on the same page under Radio.Root.
      Item: 'root'
    }
  },
  Select: {
    slug: 'select',
    parts: {
      Root: 'root',
      Label: 'label',
      Trigger: 'trigger',
      Value: 'value',
      Icon: 'icon',
      Portal: 'portal',
      Positioner: 'positioner',
      Popup: 'popup',
      List: 'list',
      Item: 'item',
      ItemText: 'itemtext',
      ItemIndicator: 'itemindicator',
      Group: 'group',
      GroupLabel: 'grouplabel',
      ScrollUpArrow: 'scrolluparrow',
      ScrollDownArrow: 'scrolldownarrow',
      Separator: 'separator'
    }
  },
  Toggle: {
    slug: 'toggle',
    parts: {}
  },
  ToggleGroup: {
    slug: 'toggle-group',
    parts: {
      Root: 'api-reference'
    }
  },
  Slider: {
    slug: 'slider',
    parts: {
      Root: 'root',
      Label: 'label',
      Value: 'value',
      Control: 'control',
      Track: 'track',
      Indicator: 'indicator',
      Thumb: 'thumb'
    }
  }
}

function baseUiHrefFor(displayName: string): string | null {
  const [compound, ...rest] = displayName.split('.')
  if (!compound) return null
  const entry = BASE_UI_COMPOUNDS[compound]
  if (!entry) return null
  const base = `https://base-ui.com/react/components/${entry.slug}`
  // Bare compound name (no dot) uses the `Root` part anchor if Base UI
  // documents one. For Select/Combobox/Autocomplete that's `#root`; for
  // RadioGroup it's `#radiogroup` (Base UI's shared /radio page groups
  // both Radio and RadioGroup). Falls back to the bare component page
  // when the compound has no sub-parts (e.g. Button).
  const partName = rest.length === 0 ? 'Root' : rest.join('')
  const anchor = entry.parts[partName]
  if (!anchor) return rest.length === 0 ? base : null
  return `${base}#${anchor}`
}

type PropGroup = { from?: string; props: ManifestProp[] }

function groupBySource(props: ManifestProp[]): PropGroup[] {
  const groups = new Map<string | undefined, ManifestProp[]>([[undefined, []]])
  for (const prop of props) {
    groups.set(prop.from, [...(groups.get(prop.from) ?? []), prop])
  }
  return Array.from(groups, ([from, props]) => ({ from, props })).filter(
    (group) => group.props.length > 0
  )
}

export function PropsList({
  props,
  title
}: {
  props: ManifestProp[]
  title?: string
}) {
  return (
    <div className='grid divide-y divide-subtler'>
      {title && (
        <div className='bg-subtler px-4 py-3'>
          <p className='text-base font-bold text-subtle'>{title}</p>
        </div>
      )}
      <dl className='grid divide-y divide-subtler'>
        {props.map((prop) => (
          <div key={prop.name} className='grid gap-1 px-4 py-3'>
            <dt className='flex flex-wrap items-center gap-x-2 gap-y-1'>
              <div className='flex flex-col items-baseline gap-1 md:flex-row md:gap-2'>
                <span className='shrink-0 font-mono text-sm font-semibold'>
                  {prop.name}
                </span>
                <span className='font-mono text-sm text-info-11'>
                  {prop.type}
                </span>
              </div>
              {prop.required && (
                <Badge intent='danger' size='sm'>
                  Required
                </Badge>
              )}
              {prop.deprecated !== undefined && (
                <Badge intent='warning' emphasis='subtle' size='sm'>
                  Deprecated
                </Badge>
              )}
            </dt>
            <dd>
              <div className='grid gap-2'>
                {prop.description && (
                  <p className='text-subtle'>{prop.description}</p>
                )}
                {prop.deprecated && (
                  <p className='text-sm text-subtle intent-warning'>
                    <span className='font-semibold'>Deprecated:</span>{' '}
                    {prop.deprecated}
                  </p>
                )}
                {prop.default !== undefined && (
                  <p className='text-sm text-subtle'>
                    Defaults to <Code>{prop.default}</Code>.
                  </p>
                )}
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// Base UI types every part's className as a state function, so a part whose
// only prop is that className adds nothing to the element it wraps.
function addsNoProps(props: ManifestProp[]) {
  return props.every(
    (prop) => prop.name === 'className' && prop.type !== 'string'
  )
}

function PartProps({ props }: { props: ManifestProp[] }) {
  if (addsNoProps(props)) {
    return (
      <p className='text-sm text-subtle'>
        No additional props. It forwards all standard HTML attributes to the
        underlying element.
      </p>
    )
  }

  return (
    <div className='overflow-hidden rounded-xl border border-subtler'>
      {groupBySource(props).map(({ from, props }) => (
        <PropsList
          key={from ?? ''}
          props={props}
          title={from && `Inherited from ${from}`}
        />
      ))}
    </div>
  )
}

function PartSection({ part }: { part: ManifestPart }) {
  const baseUiHref = baseUiHrefFor(part.name)
  return (
    <section className='grid gap-3'>
      <header className='grid gap-1'>
        <div className='flex flex-wrap items-center gap-3'>
          <h3 className='font-mono text-lg font-bold'>{part.name}</h3>
          {baseUiHref && (
            <a
              href={baseUiHref}
              target='_blank'
              rel='noreferrer'
              className='is-interactive inline-flex items-center gap-1 rounded-full emphasis-subtler px-2 py-0.5 text-xs font-medium text-subtle'
            >
              Base UI
              <ArrowSquareOutIcon weight='bold' className='size-3' />
            </a>
          )}
        </div>
        {part.description && <p className='text-subtle'>{part.description}</p>}
      </header>
      <PartProps props={part.props} />
    </section>
  )
}

type PropsDefinitionsProps = {
  /** Component names from a `roadie.manifest.json`, listed in this order. Each lists its parts after it. */
  component: string | string[]
}

export function PropsDefinitions({ component }: PropsDefinitionsProps) {
  const names = Array.isArray(component) ? component : [component]
  const parts = names.flatMap((name) => {
    const found = manifestComponent(name)
    return [found, ...(found.parts ?? [])]
  })

  return (
    <div data-not-prose className='mt-8 grid gap-8 pt-8'>
      <h2 className='text-xl font-bold'>API reference</h2>
      {parts.map((part) => (
        <PartSection key={part.name} part={part} />
      ))}
    </div>
  )
}
