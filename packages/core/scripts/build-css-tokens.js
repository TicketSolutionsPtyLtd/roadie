import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper to flatten nested objects into dot notation paths
function flattenObject(obj, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    // Skip metadata keys
    if (key.startsWith('$')) continue

    // Handle special key naming
    let newKey
    if (key === 'default') {
      // Skip 'default' keys - they should merge with parent
      newKey = prefix
    } else if (key.startsWith('A')) {
      // Alpha colors: convert A1 to a1 (single hyphen)
      newKey = prefix ? `${prefix}-${key.toLowerCase()}` : key.toLowerCase()
    } else {
      newKey = prefix ? `${prefix}-${key}` : key
    }

    if (typeof value === 'object' && value !== null) {
      if (value.$value !== undefined) {
        // This is a token leaf node
        result[newKey] = value
      } else {
        // This is a nested group - recurse
        flattenObject(value, newKey, result)
      }
    }
  }
  return result
}

// Convert token reference {colors.blue.5} to CSS variable --colors-blue-5
function tokenRefToCssVar(reference) {
  // Remove curly braces
  const path = reference.replace(/[{}]/g, '')
  // Split by dots to handle each segment
  const segments = path.split('.')
  const kebabSegments = segments.map((segment) => {
    // Check if segment starts with capital A (alpha colors like A1, A2)
    if (/^A\d+$/.test(segment)) {
      return segment.toLowerCase()
    }
    // Convert camelCase to kebab-case
    return segment.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
  })
  return `var(--${kebabSegments.join('-')})`
}

// Helper to resolve token references to CSS variables
function resolveTokenReferenceToCssVar(value) {
  if (typeof value !== 'string') return String(value)

  const referencePattern = /\{([^}]+)\}/g
  let resolvedValue = value

  const matches = [...value.matchAll(referencePattern)]
  for (const match of matches) {
    const cssVar = tokenRefToCssVar(match[0])
    resolvedValue = resolvedValue.replace(match[0], cssVar)
  }

  return resolvedValue
}

// Convert shadow object to CSS shadow string
function shadowObjectToCss(shadowObj) {
  if (typeof shadowObj === 'string') {
    return resolveTokenReferenceToCssVar(shadowObj)
  }

  if (typeof shadowObj !== 'object' || shadowObj === null) {
    return String(shadowObj)
  }

  const inset = shadowObj.inset ? 'inset ' : ''
  const offsetX = resolveTokenReferenceToCssVar(
    shadowObj.offsetX ? String(shadowObj.offsetX) : '0'
  )
  const offsetY = resolveTokenReferenceToCssVar(
    shadowObj.offsetY ? String(shadowObj.offsetY) : '0'
  )
  const blurRadius = resolveTokenReferenceToCssVar(
    shadowObj.blurRadius ? String(shadowObj.blurRadius) : '0'
  )
  const spreadRadius = shadowObj.spreadRadius
    ? ` ${resolveTokenReferenceToCssVar(String(shadowObj.spreadRadius))}`
    : ''
  const color = resolveTokenReferenceToCssVar(
    shadowObj.color ? String(shadowObj.color) : 'transparent'
  )

  return `${inset}${offsetX} ${offsetY} ${blurRadius}${spreadRadius} ${color}`
}

// Process a mode-specific value (could be string reference or complex value like shadow array)
function processModeValue(value, tokenType) {
  // If it's a string, it's a token reference
  if (typeof value === 'string') {
    return resolveTokenReferenceToCssVar(value)
  }

  // If it's an array of shadow objects
  if (tokenType === 'shadow' && Array.isArray(value)) {
    return value.map((v) => shadowObjectToCss(v)).join(', ')
  }

  // If it's a single shadow object
  if (tokenType === 'shadow' && typeof value === 'object') {
    return shadowObjectToCss(value)
  }

  // For arrays, join them
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(', ')
  }

  // Otherwise convert to string and resolve references
  return resolveTokenReferenceToCssVar(String(value))
}

// Process token value based on its type
function processTokenValue(token) {
  let value = token.$value

  // Handle textStyle objects (complex composite tokens)
  if (
    token.$type === 'textStyle' &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return null // Will be handled separately in utilities
  }

  // Handle shadow arrays
  if (token.$type === 'shadow' && Array.isArray(value)) {
    return value.map((v) => shadowObjectToCss(v)).join(', ')
  }

  // Handle shadow objects
  if (token.$type === 'shadow' && typeof value === 'object') {
    return shadowObjectToCss(value)
  }

  // Handle font family arrays
  if (token.$type === 'fontFamily' && Array.isArray(value)) {
    return value.map((v) => resolveTokenReferenceToCssVar(String(v))).join(', ')
  }

  // Handle font family strings
  if (token.$type === 'fontFamily') {
    return resolveTokenReferenceToCssVar(String(value))
  }

  // Handle other arrays
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  // Resolve any token references to CSS variables
  return resolveTokenReferenceToCssVar(String(value))
}

// Generate CSS variable name from token path
function generateCssVarName(path) {
  // Replace camelCase with kebab-case
  return path.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

// Check if a token path represents a color
function isColorToken(tokenPath) {
  return tokenPath.startsWith('colors-')
}

// Main build function
function buildCssTokens() {
  // Read the input files
  const tokensPath = path.join(__dirname, '../src/tokens/tokens.json')
  const semanticTokensPath = path.join(
    __dirname,
    '../src/tokens/semantic-tokens.json'
  )

  const baseTokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'))
  const semanticTokens = JSON.parse(fs.readFileSync(semanticTokensPath, 'utf8'))

  // Flatten base tokens
  const flatBaseTokens = {}
  for (const [tokenType, tokenGroup] of Object.entries(baseTokens)) {
    if (typeof tokenGroup !== 'object' || !tokenGroup.$type) continue
    const flattened = flattenObject(tokenGroup, tokenType)
    Object.assign(flatBaseTokens, flattened)
  }

  // Flatten semantic tokens
  const flatSemanticTokens = {}
  for (const [tokenType, tokenGroup] of Object.entries(semanticTokens)) {
    if (typeof tokenGroup !== 'object' || !tokenGroup.$type) continue
    const flattened = flattenObject(tokenGroup, tokenType)
    Object.assign(flatSemanticTokens, flattened)
  }

  // Separate tokens into categories
  const baseVars = []
  const lightModeColorVars = []
  const darkModeColorVars = []
  const semanticVars = []
  const textStyleUtilities = []

  // Process base tokens (no mode support)
  for (const [tokenPath, token] of Object.entries(flatBaseTokens)) {
    const value = processTokenValue(token)

    if (value === null) {
      // This is a composite token (textStyle) - add to utilities
      const className = generateCssVarName(tokenPath)
      textStyleUtilities.push({ className, token })
    } else {
      const cssVarName = generateCssVarName(tokenPath)
      if (tokenPath.includes('shadow')) {
        console.log(
          'BASE Shadow:',
          tokenPath,
          'Type:',
          token.$type,
          'Array:',
          Array.isArray(token.$value),
          'Result:',
          value
        )
      }
      baseVars.push(`  --${cssVarName}: ${value};`)
    }
  }

  // Process semantic tokens (with light/dark mode support for colors)
  for (const [tokenPath, token] of Object.entries(flatSemanticTokens)) {
    const value = processTokenValue(token)

    if (value === null) {
      // This is a composite token (textStyle) - add to utilities
      const className = generateCssVarName(tokenPath)
      textStyleUtilities.push({ className, token })
      continue
    }

    const cssVarName = generateCssVarName(tokenPath)
    const isColor = isColorToken(tokenPath)

    // Check if token has mode-specific values
    const hasMode = token.$extensions?.mode

    if (hasMode && isColor) {
      // Color tokens with modes go in light/dark selectors
      const lightValue = processModeValue(hasMode.light, token.$type)
      const darkValue = processModeValue(hasMode.dark, token.$type)
      lightModeColorVars.push(`  --${cssVarName}: ${lightValue};`)
      darkModeColorVars.push(`  --${cssVarName}: ${darkValue};`)
    } else if (hasMode) {
      // Non-color tokens with modes - use light mode value in :root
      const lightValue = processModeValue(hasMode.light, token.$type)
      semanticVars.push(`  --${cssVarName}: ${lightValue};`)
    } else {
      // No mode-specific values
      semanticVars.push(`  --${cssVarName}: ${value};`)
    }
  }

  // Build the final CSS
  let css = '/**\n'
  css += ' * Design Tokens - CSS Variables\n'
  css += ' * Auto-generated from tokens.json and semantic-tokens.json\n'
  css += ' * Do not edit this file directly\n'
  css += ' */\n\n'

  // Main :root with base tokens, semantic tokens, and light mode colors
  css += ':root {\n'
  css += baseVars.join('\n')
  if (
    baseVars.length > 0 &&
    (lightModeColorVars.length > 0 || semanticVars.length > 0)
  ) {
    css += '\n\n'
  }
  if (lightModeColorVars.length > 0) {
    css += lightModeColorVars.join('\n')
    if (semanticVars.length > 0) {
      css += '\n\n'
    }
  }
  if (semanticVars.length > 0) {
    css += semanticVars.join('\n')
  }
  css += '\n}\n\n'

  // Dark mode colors only
  if (darkModeColorVars.length > 0) {
    css += ':root[data-color-mode="dark"] {\n'
    css += darkModeColorVars.join('\n')
    css += '\n}\n'
  }

  // Write the tokens.css file to src/tokens/css
  const outputDir = path.join(__dirname, '../src/tokens/css')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  const outputPath = path.join(outputDir, 'tokens.css')
  fs.writeFileSync(outputPath, css)

  // Copy tokens.css to dist directory
  const distDir = path.join(__dirname, '../dist')
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }
  const distTokensPath = path.join(distDir, 'tokens.css')
  fs.writeFileSync(distTokensPath, css)

  // Generate utilities.css for composite tokens
  if (textStyleUtilities.length > 0) {
    let utilitiesCss = '/**\n'
    utilitiesCss += ' * Design Tokens - Utility Classes\n'
    utilitiesCss += ' * Auto-generated composite tokens (text styles, etc.)\n'
    utilitiesCss += ' * Do not edit this file directly\n'
    utilitiesCss += ' */\n\n'

    for (const { className, token } of textStyleUtilities) {
      const textStyle = token.$value
      utilitiesCss += `.${className} {\n`

      if (textStyle.fontFamily) {
        const fontFamily = resolveTokenReferenceToCssVar(textStyle.fontFamily)
        utilitiesCss += `  font-family: ${fontFamily};\n`
      }
      if (textStyle.fontSize) {
        const fontSize = resolveTokenReferenceToCssVar(textStyle.fontSize)
        utilitiesCss += `  font-size: ${fontSize};\n`
      }
      if (textStyle.fontWeight) {
        const fontWeight = resolveTokenReferenceToCssVar(textStyle.fontWeight)
        utilitiesCss += `  font-weight: ${fontWeight};\n`
      }
      if (textStyle.lineHeight) {
        const lineHeight = resolveTokenReferenceToCssVar(textStyle.lineHeight)
        utilitiesCss += `  line-height: ${lineHeight};\n`
      }
      if (textStyle.letterSpacing) {
        const letterSpacing = resolveTokenReferenceToCssVar(
          textStyle.letterSpacing
        )
        utilitiesCss += `  letter-spacing: ${letterSpacing};\n`
      }

      utilitiesCss += '}\n\n'
    }

    // Remove trailing newline and add it back to ensure consistent formatting
    utilitiesCss = utilitiesCss.trimEnd() + '\n'

    const utilitiesPath = path.join(outputDir, 'utilities.css')
    fs.writeFileSync(utilitiesPath, utilitiesCss)
    console.log(
      'Utilities built successfully! Output written to:',
      utilitiesPath
    )
    console.log(`Generated ${textStyleUtilities.length} utility classes`)
  }

  console.log('CSS tokens built successfully! Output written to:', outputPath)
  console.log(`Generated ${baseVars.length} base variables`)
  console.log(
    `Generated ${lightModeColorVars.length} light mode color variables`
  )
  console.log(`Generated ${darkModeColorVars.length} dark mode color variables`)
  console.log(`Generated ${semanticVars.length} semantic variables`)
}

// Run if called directly
if (import.meta.url === `file://${__filename}`) {
  buildCssTokens()
}

export { buildCssTokens }
