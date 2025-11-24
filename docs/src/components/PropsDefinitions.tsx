import path from 'path'
import type { PropItem } from 'react-docgen-typescript'
import { withCustomConfig } from 'react-docgen-typescript'

import { Code, Text, View } from '@oztix/roadie-components'

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
    // If the prop has a parent interface that's not from the current component, it's inherited
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

    // Otherwise, it's an own prop
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
    <View flexDirection='column' gap='200'>
      {title && (
        <View
          px='300'
          py='200'
          bg='neutral.surface.subtler'
          borderBottom='1px solid'
          borderBottomColor='neutral.border.subtler'
        >
          <Text fontSize='md' fontWeight='bold' emphasis='subtle'>
            {title}
          </Text>
        </View>
      )}
      {Object.entries(props).map(([name, prop]) => (
        <View
          key={name}
          borderBottom='1px solid'
          borderBottomColor='neutral.border.subtler'
          px='300'
          py='200'
          gap='100'
          _last={{
            borderBottom: 'none'
          }}
        >
          <View as='dt' alignItems='baseline' gap='100'>
            <View
              flexDirection={{ base: 'column', md: 'row' }}
              alignItems='baseline'
              gap='100'
            >
              <Text
                fontFamily='mono'
                fontSize='sm'
                fontWeight='600'
                flexShrink={0}
              >
                {name}
                {!prop.required && (
                  <Text as='span' emphasis='subtle'>
                    ?
                  </Text>
                )}
              </Text>
              <Text fontFamily='mono' fontSize='sm' color='information.fg'>
                {formatTypeValues(prop)}
              </Text>
            </View>
          </View>
          <View as='dd'>
            <View gap='200'>
              {prop.description && (
                <Text emphasis='subtle'>{prop.description}</Text>
              )}
              {prop.defaultValue && (
                <Text
                  as='p'
                  emphasis='subtle'
                  fontSize='sm'
                  textStyle='prose.body'
                >
                  Defaults to <Code>{prop.defaultValue.value}</Code>.
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
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
          // Include props that are:
          // 1. Directly defined in the component (no declarations)
          // 2. From our own components directory
          // 3. Have a parent interface from our components
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

    // Get the interface name from the first prop's parent type
    const interfaceName =
      Object.values(componentInfo.props)[0]?.parent?.name ||
      `${componentInfo.displayName}Props`

    return (
      <View
        gap='300'
        pt='800'
        mt='800'
        borderTop='1px solid'
        borderTopColor='neutral.border.subtle'
      >
        <Text as='h2' fontSize='xl' fontWeight='bold'>
          Props
        </Text>
        <View
          as='dl'
          flexDirection='column'
          border='1px solid'
          borderColor='neutral.border.subtle'
          borderRadius='md'
        >
          <View
            borderBottom='1px solid'
            borderBottomColor='neutral.border.subtle'
            alignSelf='stretch'
            gap='100'
            px='300'
            py='200'
            bg='neutral.surface.subtler'
          >
            <Text as='h3' fontSize='xl' fontWeight='bold'>
              {interfaceName}
            </Text>
            {!!componentInfo.description && (
              <Text emphasis='subtle'>{componentInfo.description}</Text>
            )}
          </View>

          {/* Component's own props */}
          {Object.keys(groupedProps.ownProps).length > 0 && (
            <PropsList props={groupedProps.ownProps} />
          )}

          {/* Inherited props */}
          {Object.entries(groupedProps.inheritedProps).map(
            ([source, { props }]) => (
              <PropsList
                key={source}
                props={props}
                title={`Inherited from ${source}`}
              />
            )
          )}
        </View>
      </View>
    )
  } catch (error) {
    console.error('Error parsing component:', error)
    return null
  }
}
