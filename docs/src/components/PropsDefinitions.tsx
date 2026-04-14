import path from 'path'
import type { PropItem } from 'react-docgen-typescript'
import { withCustomConfig } from 'react-docgen-typescript'

import {
  PropsAccordion,
  type PropsAccordionItem
} from '@/components/PropsAccordion'

import { Code } from '@oztix/roadie-components'

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
      <p className='px-4 py-3 text-sm text-subtle'>
        No additional props — forwards all standard HTML attributes to the
        underlying element.
      </p>
    )
  }

  return (
    <>
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
    </>
  )
}

function ComponentPropsCard({
  componentInfo,
  groupedProps
}: {
  componentInfo: { displayName: string; description?: string }
  groupedProps: GroupedProps
}) {
  const interfaceName = `${componentInfo.displayName}Props`

  return (
    <dl className='grid overflow-hidden rounded-xl border border-subtler'>
      <div className='grid gap-1 bg-subtler px-4 py-3'>
        <h3 className='text-xl font-bold'>{interfaceName}</h3>
        {!!componentInfo.description && (
          <p className='text-subtle'>{componentInfo.description}</p>
        )}
      </div>
      <ComponentPropsBody groupedProps={groupedProps} />
    </dl>
  )
}

function parseComponentProps(componentPath: string) {
  const workspaceRoot = path.resolve(process.cwd(), '..')
  const absolutePath = path.join(workspaceRoot, componentPath)

  try {
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

    const result = parser.parse(absolutePath)
    if (!result.length) return null

    // Keep every PascalCase entry. CVA factory functions (`cardVariants`,
    // `carouselContentVariants`, etc.) are camelCase and get skipped here.
    //
    // We intentionally don't require props to be present: many compound
    // parts forward a plain `ComponentProps<'div'>` and would otherwise
    // silently vanish from the docs once the propFilter strips every
    // HTML-only prop. A section with a "forwards all HTML attributes"
    // note is more useful than no section at all.
    const filtered = result.filter((info) => /^[A-Z]/.test(info.displayName))

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

  // Split on dot-notation displayName (the Pattern A convention — see
  // `docs/contributing/COMPOUND_PATTERNS.md`). Dot-notation entries are
  // true compound subcomponents and go in the collapsible accordion.
  // Non-dot entries render as inline cards — this covers both the
  // single-root case AND files like `Button/index.tsx` that re-export
  // sibling components (Button + IconButton) which aren't parent/child.
  const inlineComponents = components.filter(
    (info) => !info.displayName.includes('.')
  )
  const subcomponents = components.filter((info) =>
    info.displayName.includes('.')
  )

  const accordionItems: PropsAccordionItem[] = subcomponents.map((info) => {
    const grouped = groupPropsBySource(info.props, info.displayName)
    return {
      displayName: info.displayName,
      description: info.description,
      ownCount: Object.keys(grouped.ownProps).length,
      body: <ComponentPropsBody groupedProps={grouped} />
    }
  })

  return (
    <div className='mt-8 grid gap-4 pt-8'>
      <h2 className='text-xl font-bold'>Props</h2>

      {inlineComponents.map((componentInfo) => {
        const grouped = groupPropsBySource(
          componentInfo.props,
          componentInfo.displayName
        )
        return (
          <ComponentPropsCard
            key={componentInfo.displayName}
            componentInfo={componentInfo}
            groupedProps={grouped}
          />
        )
      })}

      {accordionItems.length > 0 && (
        <div className='grid gap-2'>
          <h3 className='text-sm font-semibold text-subtle'>Subcomponents</h3>
          <PropsAccordion items={accordionItems} />
        </div>
      )}
    </div>
  )
}
