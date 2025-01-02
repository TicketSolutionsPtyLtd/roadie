import { Code, Text, View } from '@oztix/roadie-components'
import { semanticTokens, tokens } from '@oztix/roadie-core'

export const metadata = {
  title: 'Colors',
  description:
    'Our color system is built on semantic tokens for consistent, meaningful usage across our products.'
}

interface TokenExtension {
  [key: string]: string | number | boolean | null | TokenExtension
}

interface TokenValue {
  $type?: string
  $value?: string
  $description?: string
  $extensions?: TokenExtension
}

interface ColorToken {
  [key: string]: TokenValue | { [key: string]: TokenValue }
}

const baseColors = tokens.colors
const semanticColors = semanticTokens.colors

const toSentenceCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

const formatColorKey = (str: string) => str.replace('fg', 'Foreground').replace('bg', 'Background')

const convertToTitle = (str: string) => toSentenceCase(formatColorKey(str))

const camelCaseToKebabCase = (str: string) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

const colorValueConformed = (str: string) =>
  camelCaseToKebabCase(str)
    .replace(/\./g, '-')
    .replace(/-a(\d+)/g, '--a$1')

function ColorSwatch({
  color,
  name,
  description,
  appearance = 'semantic'
}: {
  color: string
  name: string
  description?: string
  appearance?: 'semantic' | 'base'
}) {
  return (
    <View
      gap={appearance === 'semantic' ? '200' : '100'}
      alignItems='flex-start'
      flexDirection={appearance === 'semantic' ? 'row' : 'column'}
    >
      <View
        style={
          {
            '--color-swatch': `var(--colors-${colorValueConformed(color)})`
          } as React.CSSProperties
        }
        backgroundColor='var(--color-swatch)'
        height={appearance === 'semantic' ? '1000' : '600'}
        width={appearance === 'semantic' ? '1000' : '600'}
        borderRadius='100'
        border='1px solid'
        borderColor='border.subtlest'
        flexShrink={0}
      />
      <View gap='100' alignItems='flex-start'>
        <Text fontWeight='semibold'>{convertToTitle(name)}</Text>
        {appearance === 'semantic' && <Code>{color}</Code>}
        {appearance === 'semantic' && description && (
          <Text fontSize='sm' color='fg.subtle'>
            {description}
          </Text>
        )}
      </View>
    </View>
  )
}

function SemanticColorList({
  title,
  colors,
  parentPath = '',
  depth = 3
}: {
  title: string
  colors: ColorToken
  parentPath?: string
  depth?: number
}) {
  const colorEntries = Object.entries(colors).filter(([key]) => !key.startsWith('$'))

  const headingElement = `h${Math.min(depth, 6)}` as 'h3' | 'h4' | 'h5' | 'h6'
  const fontSize = depth === 3 ? '2xl' : depth === 4 ? 'xl' : 'lg'
  const ViewGap = depth === 3 ? '800' : depth === 4 ? '600' : '300'

  const hasOnlyTokenValues = colorEntries.every(
    ([, value]) => typeof value === 'object' && '$value' in value
  )

  const description = (colors as TokenValue)?.$description

  return (
    <View gap='200'>
      <View gap='100'>
        <Text as={headingElement} fontSize={fontSize} fontWeight='semibold'>
          {convertToTitle(title)}
        </Text>
        {description && (
          <Text fontSize='lg' color='fg.subtle'>
            {description}
          </Text>
        )}
      </View>
      <View gap={hasOnlyTokenValues ? '200' : ViewGap}>
        {colorEntries.map(([shade, value]) => {
          const isTokenValue = (v: unknown): v is TokenValue =>
            typeof v === 'object' && v !== null && '$value' in v

          const isNestedColors = (v: unknown): v is { [key: string]: TokenValue } =>
            typeof v === 'object' && v !== null && !('$value' in v)

          if (isNestedColors(value)) {
            return (
              <SemanticColorList
                key={shade}
                title={shade}
                colors={value}
                parentPath={parentPath ? `${parentPath}.${title}` : title}
                depth={depth + 1}
              />
            )
          }

          if (isTokenValue(value)) {
            const path = parentPath ? `${parentPath}.${title}.${shade}` : `${title}.${shade}`
            const colorValue = path.endsWith('.default') ? path.slice(0, -8) : path
            return (
              <ColorSwatch
                key={shade}
                name={shade}
                color={colorValue}
                description={value.$description}
                appearance='semantic'
              />
            )
          }
          return null
        })}
      </View>
    </View>
  )
}

function ColorPalette({
  title,
  colors,
  parentPath = ''
}: {
  title: string
  colors: ColorToken
  parentPath?: string
}) {
  const colorEntries = Object.entries(colors).filter(([key]) => !key.startsWith('$'))

  // Separate opaque and transparent colors
  const opaqueColors = colorEntries.filter(([key]) => !key.includes('A'))
  const transparentColors = colorEntries.filter(([key]) => key.includes('A'))

  const description = (colors as TokenValue)?.$description

  return (
    <View gap='200'>
      <View gap='100'>
        <Text as='h3' fontSize='lg' fontWeight='semibold'>
          {convertToTitle(title)}
        </Text>
        {description && (
          <Text fontSize='sm' color='fg.subtle'>
            {description}
          </Text>
        )}
      </View>
      <View gap='200'>
        {opaqueColors.length > 0 && (
          <View gap='100' flexDirection='row' flexWrap='wrap'>
            {opaqueColors.map(([shade, value]) => {
              const isNestedColors = (v: unknown): v is { [key: string]: TokenValue } =>
                typeof v === 'object' && v !== null && !('$value' in v)

              if (isNestedColors(value)) {
                return (
                  <ColorPalette
                    key={shade}
                    title={shade}
                    colors={value}
                    parentPath={parentPath ? `${parentPath}.${title}` : title}
                  />
                )
              }

              const path = parentPath ? `${parentPath}.${title}.${shade}` : `${title}.${shade}`
              const colorValue = path.endsWith('.default') ? path.slice(0, -8) : path

              return (
                <ColorSwatch key={shade} name={`${shade}`} color={colorValue} appearance='base' />
              )
            })}
          </View>
        )}

        {/* Only render transparent colors if they exist */}
        {transparentColors.length > 0 && (
          <View gap='100' flexDirection='row' flexWrap='wrap'>
            {transparentColors.map(([shade]) => {
              const path = parentPath ? `${parentPath}.${title}.${shade}` : `${title}.${shade}`
              const colorValue = path.endsWith('.default') ? path.slice(0, -8) : path

              return (
                <ColorSwatch key={shade} name={`${shade}`} color={colorValue} appearance='base' />
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}

export default function ColorsPage() {
  const semanticColorGroups = Object.entries(semanticColors).filter(
    ([key, value]) => !key.startsWith('$') && typeof value === 'object'
  )

  const baseColorGroups = Object.entries(baseColors).filter(
    ([key, value]) => !key.startsWith('$') && typeof value === 'object'
  )

  return (
    <View>
      <View gap='1000'>
        <View gap='100'>
          <Text as='h1' fontSize='5xl' fontWeight='black'>
            Colors
          </Text>
          <Text fontSize='xl' color='fg.subtle'>
            Our color system is built on semantic tokens for consistent, meaningful usage across our
            products.
          </Text>
        </View>

        <View gap='600'>
          <View gap='200'>
            <Text as='h2' fontSize='4xl' fontWeight='semibold'>
              Semantic colors
            </Text>
            <Text fontSize='lg' color='fg.subtle'>
              Semantic colors provide meaning and consistency across our interface.
            </Text>
          </View>
          <View gap='800'>
            {semanticColorGroups.map(([name, colors]) => (
              <SemanticColorList key={name} title={name} colors={colors as ColorToken} />
            ))}
          </View>
        </View>

        <View gap='600'>
          <View gap='200'>
            <Text as='h2' fontSize='4xl' fontWeight='semibold'>
              Base colors
            </Text>
            <Text color='fg.subtle' fontSize='lg'>
              Our foundational color palette that powers our semantic color system.
            </Text>
          </View>
          <View gap='600'>
            {baseColorGroups.map(([name, colors]) => (
              <ColorPalette key={name} title={name} colors={colors as ColorToken} />
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}
