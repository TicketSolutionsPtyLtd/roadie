import { ArrowSquareOutIcon } from '@phosphor-icons/react/ssr'
import { readdirSync, statSync } from 'fs'
import path from 'path'
import type { PropItem } from 'react-docgen-typescript'
import { withCustomConfig } from 'react-docgen-typescript'

import { Code } from '@oztix/roadie-components'

// Compounds that wrap a Base UI primitive. Every sub-component section
// renders a small link to the matching Base UI docs page — the root entry
// links to the component page, dot-notation entries link to the part anchor.
// Base UI's URL scheme is `https://base-ui.com/react/components/<slug>#<part>`
// where <part> is the sub-component name in kebab-case. If a sub-component
// doesn't exist on the Base UI side (e.g. Roadie-native `Select.HelperText`,
// `Select.Content`, `Select.ErrorText`), the anchor still loads the top of
// the Base UI component page — a graceful fallback rather than a 404.
const BASE_UI_COMPOUNDS: Record<string, string> = {
  Autocomplete: 'autocomplete',
  Button: 'button',
  Combobox: 'combobox',
  RadioGroup: 'radio-group',
  Select: 'select'
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function baseUiHrefFor(displayName: string): string | null {
  const [compound, ...rest] = displayName.split('.')
  if (!compound) return null
  const slug = BASE_UI_COMPOUNDS[compound]
  if (!slug) return null
  const base = `https://base-ui.com/react/components/${slug}`
  if (rest.length === 0) return base
  return `${base}#${toKebabCase(rest.join(''))}`
}

interface ComponentProp {
  required: boolean
  type: {
    name: string
    value?: Array<{
      value: string
      description?: string
    }>
    raw?: string
  }
  defaultValue?: { value: string }
  description?: string
  parent?: { fileName: string; name: string }
  declarations?: Array<{ fileName: string }>
}

interface GroupedProps {
  ownProps: Record<string, ComponentProp>
  inheritedProps: Record<
    string,
    { props: Record<string, ComponentProp>; from: string }
  >
}

interface PropsDefinitionsProps {
  componentPath: string
}

function formatTypeValues(prop: ComponentProp): string {
  if (prop.type.value) {
    return prop.type.value
      .map((v) => `"${v.value.replace(/['"]/g, '')}"`)
      .join(' | ')
  }

  if (prop.type.name.includes('|')) {
    return prop.type.name
      .split('|')
      .map((value) => value.trim())
      .filter((value) => value !== 'undefined')
      .join(' | ')
  }

  return prop.type.name
}

function groupPropsBySource(
  props: Record<string, ComponentProp>,
  componentName: string
): GroupedProps {
  const result: GroupedProps = {
    ownProps: {},
    inheritedProps: {}
  }

  Object.entries(props).forEach(([name, prop]) => {
    if (prop.parent?.name && !prop.parent.name.startsWith(componentName)) {
      const parentName = prop.parent.name
      if (!result.inheritedProps[parentName]) {
        result.inheritedProps[parentName] = {
          props: {},
          from: parentName
        }
      }
      result.inheritedProps[parentName]!.props[name] = prop
      return
    }

    result.ownProps[name] = prop
  })

  return result
}

function PropsList({
  props,
  title
}: {
  props: Record<string, ComponentProp>
  title?: string
}) {
  return (
    <div className='grid divide-y divide-subtler'>
      {title && (
        <div className='bg-subtler px-4 py-3'>
          <p className='text-base font-bold text-subtle'>{title}</p>
        </div>
      )}
      {Object.entries(props).map(([name, prop]) => (
        <div key={name} className='grid gap-1 px-4 py-3'>
          <dt className='flex items-baseline gap-1'>
            <div className='flex flex-col items-baseline gap-1 md:flex-row'>
              <span className='shrink-0 font-mono text-sm font-semibold'>
                {name}
                {!prop.required && <span className='text-subtle'>?</span>}
              </span>
              <span className='font-mono text-sm text-info-11'>
                {formatTypeValues(prop)}
              </span>
            </div>
          </dt>
          <dd>
            <div className='grid gap-2'>
              {prop.description && (
                <p className='text-subtle'>{prop.description}</p>
              )}
              {prop.defaultValue && (
                <p className='text-sm text-subtle'>
                  Defaults to <Code>{prop.defaultValue.value}</Code>.
                </p>
              )}
            </div>
          </dd>
        </div>
      ))}
    </div>
  )
}

function ComponentPropsBody({ groupedProps }: { groupedProps: GroupedProps }) {
  const hasOwnProps = Object.keys(groupedProps.ownProps).length > 0
  const hasInheritedProps = Object.keys(groupedProps.inheritedProps).length > 0

  if (!hasOwnProps && !hasInheritedProps) {
    return (
      <p className='text-sm text-subtle'>
        No additional props — forwards all standard HTML attributes to the
        underlying element.
      </p>
    )
  }

  return (
    <div className='overflow-hidden rounded-xl border border-subtler'>
      {hasOwnProps && <PropsList props={groupedProps.ownProps} />}
      {Object.entries(groupedProps.inheritedProps).map(
        ([source, { props }]) => (
          <PropsList
            key={source}
            props={props}
            title={`Inherited from ${source}`}
          />
        )
      )}
    </div>
  )
}

function ComponentSection({
  componentInfo,
  groupedProps
}: {
  componentInfo: { displayName: string; description?: string }
  groupedProps: GroupedProps
}) {
  const baseUiHref = baseUiHrefFor(componentInfo.displayName)
  return (
    <section className='grid gap-3'>
      <header className='grid gap-1'>
        <div className='flex flex-wrap items-center gap-3'>
          <h3 className='font-mono text-lg font-bold'>
            {componentInfo.displayName}
          </h3>
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
        {!!componentInfo.description && (
          <p className='text-subtle'>{componentInfo.description}</p>
        )}
      </header>
      <ComponentPropsBody groupedProps={groupedProps} />
    </section>
  )
}

type ParseTargets = {
  files: string[]
  /** Non-null when componentPath is a per-file compound folder. */
  compoundName: string | null
}

function resolveParseTargets(componentPath: string): ParseTargets {
  // Pre-Pattern-A compounds still point `componentPath` at a single file
  // (e.g. `packages/components/src/components/Card/index.tsx`). Post-migration
  // compounds point at the folder (e.g. `packages/components/src/components/Fieldset`)
  // because each sub-component is its own file and `index.tsx` is a server-safe
  // property-assignment layer that react-docgen-typescript can't drill into.
  //
  // Accept either form. When the path is a directory, enumerate every non-test
  // `.tsx` leaf inside — `parseComponentProps` also rewrites the parsed leaf
  // displayNames using the folder basename as the compound prefix.
  const workspaceRoot = path.resolve(process.cwd(), '..')
  const absolutePath = path.join(workspaceRoot, componentPath)
  const stats = statSync(absolutePath)

  if (stats.isFile()) {
    return { files: [absolutePath], compoundName: null }
  }

  const files = readdirSync(absolutePath)
    .filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'))
    .sort()
    .map((name) => path.join(absolutePath, name))

  return { files, compoundName: path.basename(absolutePath) }
}

function parseComponentProps(componentPath: string) {
  const { files: targets, compoundName } = resolveParseTargets(componentPath)

  try {
    const workspaceRoot = path.resolve(process.cwd(), '..')
    const parser = withCustomConfig(
      path.resolve(workspaceRoot, 'tsconfig.react.json'),
      {
        savePropValueAsString: true,
        shouldExtractLiteralValuesFromEnum: true,
        shouldRemoveUndefinedFromOptional: true,
        propFilter: (prop: PropItem): boolean => {
          // Always exclude internal React/HTML props that add noise
          const skipProps = new Set([
            'ref',
            'key',
            'style',
            'dangerouslySetInnerHTML'
          ])
          if (skipProps.has(prop.name)) return false

          if (!prop.declarations?.length) {
            return true
          }

          // Include props declared in our component files
          const isFromOurComponents = prop.declarations.some(
            (d) =>
              d.fileName.includes('/components/') &&
              !d.fileName.includes('node_modules')
          )

          // Include props whose parent interface is in our code
          const isFromParentComponent =
            prop.parent?.fileName.includes('/components/') &&
            !prop.parent.fileName.includes('node_modules')

          // Include props from Base UI component interfaces
          // (these are the useful props consumers actually configure)
          const isFromBaseUI = prop.parent?.fileName.includes('@base-ui/react')

          return Boolean(
            isFromOurComponents || isFromParentComponent || isFromBaseUI
          )
        },
        skipChildrenPropWithoutDoc: true
      }
    )

    const result = parser.parse(targets)
    if (!result.length) return null

    // Keep every PascalCase entry. CVA factory functions (`cardVariants`,
    // `carouselContentVariants`, etc.) are camelCase and get skipped here.
    //
    // We intentionally don't require props to be present: many compound
    // parts forward a plain `ComponentProps<'div'>` and would otherwise
    // silently vanish from the docs once the propFilter strips every
    // HTML-only prop. A section with a "forwards all HTML attributes"
    // note is more useful than no section at all.
    const filtered = result
      .filter((info) => /^[A-Z]/.test(info.displayName))
      // Per-file compound layout: rewrite leaf displayNames from
      // `FieldsetLegend` → `Fieldset.Legend`, drop the `FieldsetRoot`
      // duplicate of the root (the root is already surfaced by
      // `index.tsx`'s `export { Fieldset }`). react-docgen-typescript
      // returns the function name from per-file leaves and never honours
      // the runtime `Component.displayName = 'Compound.Sub'` assignment,
      // so `PropsDefinitions` fixes that up here from the folder basename.
      .flatMap((info) => {
        if (!compoundName) return [info]
        if (info.displayName === compoundName) return [info]
        if (!info.displayName.startsWith(compoundName)) return [info]
        const suffix = info.displayName.slice(compoundName.length)
        if (!suffix || !/^[A-Z]/.test(suffix)) return [info]
        if (suffix === 'Root') return []
        return [{ ...info, displayName: `${compoundName}.${suffix}` }]
      })

    // Deduplicate compound components: the parser detects each subcomponent
    // twice — once via `export function CarouselPrevious()` (yields name
    // "CarouselPrevious") and once via `Carousel.Previous = CarouselPrevious`
    // (yields name "Carousel.Previous" via the function's displayName).
    // Normalise the names (strip dots, lowercase) to merge them, preferring
    // the dot-notation entry since it carries the intended displayName.
    const seen = new Map<string, (typeof filtered)[number]>()
    filtered.forEach((info) => {
      const key = info.displayName.replace(/\./g, '').toLowerCase()
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, info)
        return
      }
      const existingHasDot = existing.displayName.includes('.')
      const currentHasDot = info.displayName.includes('.')
      if (currentHasDot && !existingHasDot) {
        seen.set(key, info)
      }
    })
    const components = Array.from(seen.values())

    if (!components.length) return null
    return components
  } catch (error) {
    console.error('Error parsing component:', error)
    return null
  }
}

export function PropsDefinitions({ componentPath }: PropsDefinitionsProps) {
  const components = parseComponentProps(componentPath)
  if (!components) return null

  // Base UI-style API reference: every entry renders as its own stacked
  // section with a dot-notation heading (`Fieldset`, `Fieldset.Legend`, …),
  // an optional short description, and a prop table. No inline-vs-accordion
  // split. The root entry (whose displayName has no dot) sorts first;
  // sub-components keep parser order after that.
  const sortedComponents = [...components].sort((a, b) => {
    const aHasDot = a.displayName.includes('.')
    const bHasDot = b.displayName.includes('.')
    if (aHasDot === bHasDot) return 0
    return aHasDot ? 1 : -1
  })

  return (
    <div className='mt-8 grid gap-8 pt-8'>
      <h2 className='text-xl font-bold'>API reference</h2>
      {sortedComponents.map((componentInfo) => {
        const grouped = groupPropsBySource(
          componentInfo.props,
          componentInfo.displayName
        )
        return (
          <ComponentSection
            key={componentInfo.displayName}
            componentInfo={componentInfo}
            groupedProps={grouped}
          />
        )
      })}
    </div>
  )
}
