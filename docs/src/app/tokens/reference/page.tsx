'use client'

import { useEffect, useState } from 'react'

import { Code, Heading, Text, View } from '@oztix/roadie-components'
import { pandaTokens } from '@oztix/roadie-core'
import type { Token, TokenCategory } from '@oztix/roadie-core/tokens'
import { token } from '@oztix/roadie-core/tokens'

type TokenGroup = {
  name: string
  tokens: Array<{
    name: Token
    type: 'base' | 'semantic'
  }>
}

const TokenPreview = ({
  name,
  type,
  order
}: {
  name: Token
  type: TokenCategory
  order: number
}) => {
  if (type === 'colors') {
    const cssName = name
      .replace(/\./g, '-')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .replace(/([A-Z])(\d+)$/, '-$1$2')
      .toLowerCase()

    return (
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          backgroundColor: `var(--${cssName})`,
          border: '1px solid var(--colors-border)'
        }}
      />
    )
  }
  if (type === 'spacing' || type === 'sizes') {
    const cssName = name
      .replace(/\./g, '-')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .replace(/([A-Z])(\d+)$/, '-$1$2')
      .toLowerCase()

    return (
      <View
        height='200'
        borderRadius='050'
        backgroundColor='bg.accent.bold'
        order={order}
        style={{
          width: `var(--${cssName})`
        }}
      />
    )
  }
  return <View width='400' height='400' />
}

const TokenRow = ({ name }: { name: Token }) => {
  const type = name.split('.')[0] as TokenCategory
  const value = token(name)
  const displayName = name.split('.').slice(1).join('.')
  const isSpacingOrSize = type === 'spacing' || type === 'sizes'

  return (
    <View
      display='grid'
      width='full'
      gridTemplateColumns={{
        base: '1fr 48px',
        md: isSpacingOrSize ? '100px 200px 1fr' : '350px 48px 1fr'
      }}
      rowGap='200'
      columnGap='100'
      paddingY='150'
      borderTop='1px solid'
      borderColor='border.subtlest'
      alignItems='center'
    >
      <Code justifySelf='start' fontSize={{ base: 'sm', md: 'md' }}>
        {displayName}
      </Code>
      <TokenPreview name={name} type={type} order={isSpacingOrSize ? 3 : 2} />
      <Text
        justifySelf='start'
        display={{ base: 'block', md: 'initial' }}
        gridColumn={{ base: '1 / -1', md: 'auto' }}
        marginTop={{ base: '100', md: '0' }}
        fontSize={{ base: 'sm', md: 'md' }}
        order={isSpacingOrSize ? 2 : 3}
      >
        {value}
      </Text>
    </View>
  )
}

const tokenDescriptions: Record<string, string> = {
  colors:
    'Used with color, backgroundColor, borderColor, fill, stroke, outlineColor, accentColor, and other color-related properties',
  spacing:
    'Used with margin, padding, gap, inset, space, and other spacing-related properties',
  sizes:
    'Used with width, height, maxWidth, maxHeight, flexBasis, and other dimension properties',
  radii: 'Used with borderRadius property',
  shadows: 'Used with boxShadow and textShadow properties',
  blurs: 'Used with backdropBlur and blur properties',
  fonts: 'Used with fontFamily property',
  fontSizes: 'Used with fontSize property',
  fontWeights: 'Used with fontWeight property',
  lineHeights: 'Used with lineHeight property',
  letterSpacings: 'Used with letterSpacing property',
  breakpoints: 'Used with responsive styles and container queries',
  durations: 'Used with transitionDuration and animationDuration properties',
  easings:
    'Used with transitionTimingFunction and animationTimingFunction properties'
}

const getTokenDescription = (name: string) => tokenDescriptions[name] || ''

const TokenGroup = ({ name, tokens }: TokenGroup) => {
  const sortNumericTokens = (a: { name: Token }, b: { name: Token }) => {
    const aName = a.name.split('.').pop() || ''
    const bName = b.name.split('.').pop() || ''

    // Put 'none' at the top
    if (aName === 'none') return -1
    if (bName === 'none') return 1

    // Handle other special cases
    if (isNaN(parseInt(aName)) && isNaN(parseInt(bName))) return 0
    if (isNaN(parseInt(aName))) return 1
    if (isNaN(parseInt(bName))) return -1

    const aNum = parseInt(aName)
    const bNum = parseInt(bName)
    return aNum - bNum
  }

  const semanticTokens = tokens
    .filter((t) => t.type === 'semantic')
    .sort((a, b) => {
      if (['spacing', 'sizes', 'radii'].includes(name)) {
        return sortNumericTokens(a, b)
      }
      return 0
    })

  const baseTokens = tokens
    .filter((t) => t.type === 'base')
    .sort((a, b) => {
      if (['spacing', 'radii'].includes(name)) {
        return sortNumericTokens(a, b)
      }
      return 0
    })

  const description = getTokenDescription(name)

  return (
    <View gap='200'>
      <View
        position='sticky'
        top='0'
        backgroundColor='bg'
        paddingY='200'
        zIndex='1'
        gap='100'
      >
        <Heading as='h3' textStyle='display.ui.3'>
          {name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}
        </Heading>
        {description && <Text color='fg.subtle'>{description}</Text>}
      </View>
      <View gap='400'>
        {semanticTokens.length > 0 && (
          <View gap='200'>
            <Heading as='h4' textStyle='display.ui.5' paddingBottom='100'>
              Semantic tokens
            </Heading>
            <View overflow='hidden'>
              {semanticTokens.map((token) => (
                <TokenRow key={token.name} name={token.name} />
              ))}
            </View>
          </View>
        )}
        {baseTokens.length > 0 && (
          <View gap='200'>
            <Heading as='h4' textStyle='display.ui.5' paddingBottom='100'>
              Base tokens
            </Heading>
            <View>
              {baseTokens.map((token) => (
                <TokenRow key={token.name} name={token.name} />
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

function flattenTokens(
  obj: Record<string, any>,
  prefix = ''
): Array<[string, any]> {
  if (!obj || typeof obj !== 'object') return []

  // If it's a token value object, return it
  if ('value' in obj) {
    return [[prefix, obj]]
  }

  // Special handling for breakpoints which are direct values
  if (prefix === 'breakpoints') {
    return Object.entries(obj).map(([key, value]) => [
      `breakpoints.${key}`,
      { value }
    ])
  }

  // Get all keys except prototype
  const keys = Object.keys(obj).filter(
    (key) => key !== '[Prototype]' && key !== 'prototype'
  )

  // Process each key in order
  return keys.flatMap((key): Array<[string, any]> => {
    const value = obj[key]
    const newKey = prefix ? `${prefix}.${key}` : key
    const finalKey = newKey.endsWith('.DEFAULT') ? newKey.slice(0, -8) : newKey

    // Handle breakpoints at the top level
    if (
      key === 'breakpoints' &&
      typeof value === 'object' &&
      !('value' in value)
    ) {
      return Object.entries(value).map(([bKey, bValue]): [string, any] => [
        `breakpoints.${bKey}`,
        { value: bValue }
      ])
    }

    return flattenTokens(value, finalKey)
  })
}

export default function TokensReference() {
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [tokenType, setTokenType] = useState<TokenCategory | 'all'>('all')

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  console.log('spacing tokens:', pandaTokens.tokens.spacing)

  // Group all tokens by their category
  const baseTokenGroups = flattenTokens(pandaTokens.tokens).reduce(
    (groups, [tokenName]) => {
      const type = tokenName.split('.')[0] as keyof typeof groups
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push({ name: tokenName as Token, type: 'base' })
      return groups
    },
    {} as Record<string, Array<{ name: Token; type: 'base' | 'semantic' }>>
  )

  const semanticTokenGroups = flattenTokens(pandaTokens.semanticTokens).reduce(
    (groups, [tokenName]) => {
      const type = tokenName.split('.')[0] as keyof typeof groups
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push({ name: tokenName as Token, type: 'semantic' })
      return groups
    },
    {} as Record<string, Array<{ name: Token; type: 'base' | 'semantic' }>>
  )

  // Filter tokens based on search and type
  const filteredGroups = Object.keys({
    ...baseTokenGroups,
    ...semanticTokenGroups
  })
    .filter((type) => tokenType === 'all' || type === tokenType)
    .map((type) => {
      const semanticTokens = (semanticTokenGroups[type] || []).filter(
        (token) =>
          search === '' ||
          token.name.toLowerCase().includes(search.toLowerCase())
      )
      const baseTokens = (baseTokenGroups[type] || []).filter(
        (token) =>
          search === '' ||
          token.name.toLowerCase().includes(search.toLowerCase())
      )

      return {
        name: type,
        tokens: [...semanticTokens, ...baseTokens]
      }
    })
    .filter((group) => group.tokens.length > 0)

  return (
    <View gap='400'>
      <Heading as='h1' textStyle='display.ui.1'>
        Token reference
      </Heading>
      <View flexDirection='row' gap='200' marginBottom='400'>
        <View
          as='input'
          placeholder='Search tokens...'
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          color='fg'
          padding='150'
          borderRadius='100'
          border='2px solid'
          borderColor='border'
          bg='bg.sunken'
          flex='1'
          _hover={{
            borderColor: 'border.hovered',
            bg: 'bg.hovered'
          }}
          _focus={{
            borderColor: 'border.focused',
            bg: 'bg.focused',
            _hover: {
              borderColor: 'border.focused',
              bg: 'bg.focused'
            }
          }}
          _focusVisible={{
            outline: 'none'
          }}
        />
        <View
          as='select'
          value={tokenType}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setTokenType(e.target.value as TokenCategory | 'all')
          }
          padding='150'
          borderRadius='100'
          border='1px solid'
          borderColor='border'
          bg='bg.raised'
          color='fg'
          width='200px'
          _hover={{
            borderColor: 'border.hovered',
            bg: 'bg.hovered'
          }}
          _focusVisible={{
            borderColor: 'border.focused',
            bg: 'bg.focused'
          }}
        >
          <option value='all'>All Types</option>
          <option value='blurs'>Blurs</option>
          <option value='breakpoints'>Breakpoints</option>
          <option value='colors'>Colors</option>
          <option value='durations'>Durations</option>
          <option value='easings'>Easings</option>
          <option value='fonts'>Fonts</option>
          <option value='fontSizes'>Font Sizes</option>
          <option value='fontWeights'>Font Weights</option>
          <option value='letterSpacings'>Letter Spacing</option>
          <option value='lineHeights'>Line Heights</option>
          <option value='radii'>Border Radius</option>
          <option value='shadows'>Shadows</option>
          <option value='sizes'>Sizes</option>
          <option value='spacing'>Spacing</option>
        </View>
      </View>

      <View gap='400'>
        {filteredGroups.map((group) => (
          <TokenGroup key={group.name} {...group} />
        ))}
      </View>
    </View>
  )
}
