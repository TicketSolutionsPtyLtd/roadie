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
    <div className='flex flex-col divide-y divide-emphasis-subtler'>
      {title && (
        <div className='px-4 py-3 emphasis-subtler-surface'>
          <p className='text-base font-bold emphasis-subtle-fg'>{title}</p>
        </div>
      )}
      {Object.entries(props).map(([name, prop]) => (
        <div key={name} className='px-4 py-3 flex flex-col gap-1'>
          <dt className='flex items-baseline gap-1'>
            <div className='flex flex-col md:flex-row items-baseline gap-1'>
              <span className='font-mono text-sm font-semibold shrink-0'>
                {name}
                {!prop.required && (
                  <span className='emphasis-subtle-fg'>?</span>
                )}
              </span>
              <span className='font-mono text-sm text-info-11'>
                {formatTypeValues(prop)}
              </span>
            </div>
          </dt>
          <dd>
            <div className='flex flex-col gap-2'>
              {prop.description && (
                <p className='emphasis-subtle-fg'>{prop.description}</p>
              )}
              {prop.defaultValue && (
                <p className='emphasis-subtle-fg text-sm'>
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

export function PropsDefinitions({ componentPath }: PropsDefinitionsProps) {
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
          if (!prop.declarations?.length) {
            return true
          }

          const isFromOurComponents = prop.declarations.some(
            (d) =>
              d.fileName.includes('/components/') &&
              !d.fileName.includes('node_modules')
          )

          const isFromParentComponent =
            prop.parent?.fileName.includes('/components/') &&
            !prop.parent.fileName.includes('node_modules')

          return Boolean(isFromOurComponents || isFromParentComponent)
        },
        skipChildrenPropWithoutDoc: true
      }
    )

    const result = parser.parse(absolutePath)
    const componentInfo = result[0]
    if (!componentInfo) return null

    const groupedProps = groupPropsBySource(
      componentInfo.props,
      componentInfo.displayName
    )

    const interfaceName =
      Object.values(componentInfo.props)[0]?.parent?.name ||
      `${componentInfo.displayName}Props`

    return (
      <div className='flex flex-col gap-4 pt-8 mt-8'>
        <h2 className='text-xl font-bold'>Props</h2>
        <dl className='flex flex-col emphasis-subtler-border rounded-md overflow-hidden'>
          <div className='self-stretch flex flex-col gap-1 px-4 py-3 emphasis-subtler-surface'>
            <h3 className='text-xl font-bold'>{interfaceName}</h3>
            {!!componentInfo.description && (
              <p className='emphasis-subtle-fg'>{componentInfo.description}</p>
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
      </div>
    )
  } catch (error) {
    console.error('Error parsing component:', error)
    return null
  }
}
