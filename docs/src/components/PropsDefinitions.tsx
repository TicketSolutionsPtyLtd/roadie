import path from 'path'
import type { PropItem } from 'react-docgen-typescript'
import { withCustomConfig } from 'react-docgen-typescript'

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
              <span className='text-info-11 font-mono text-sm'>
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

    // Filter to components that have own props worth showing
    const components = result.filter((info) => {
      const grouped = groupPropsBySource(info.props, info.displayName)
      return (
        Object.keys(grouped.ownProps).length > 0 ||
        Object.keys(grouped.inheritedProps).length > 0
      )
    })

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

  return (
    <div className='mt-8 grid gap-4 pt-8'>
      <h2 className='text-xl font-bold'>Props</h2>
      {components.map((componentInfo) => {
        const groupedProps = groupPropsBySource(
          componentInfo.props,
          componentInfo.displayName
        )

        const interfaceName =
          Object.values(componentInfo.props)[0]?.parent?.name ||
          `${componentInfo.displayName}Props`

        return (
          <dl
            key={componentInfo.displayName}
            className='grid overflow-hidden rounded-xl border border-subtler'
          >
            <div className='grid gap-1 bg-subtler px-4 py-3'>
              <h3 className='text-xl font-bold'>{interfaceName}</h3>
              {!!componentInfo.description && (
                <p className='text-subtle'>{componentInfo.description}</p>
              )}
            </div>

            {Object.keys(groupedProps.ownProps).length > 0 && (
              <PropsList props={groupedProps.ownProps} />
            )}

            {Object.entries(groupedProps.inheritedProps).map(
              ([source, { props }]) => (
                <PropsList
                  key={source}
                  props={props}
                  title={`Inherited from ${source}`}
                />
              )
            )}
          </dl>
        )
      })}
    </div>
  )
}
