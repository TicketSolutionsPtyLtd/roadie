import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Token processors for different token types
export const tokenProcessors = {
  shadow: {
    processValue: (value) => {
      if (Array.isArray(value)) {
        return value.map(shadowObjectToCss).join(', ')
      }
      return shadowObjectToCss(value)
    },
    processModeValue: (modeValue) => {
      return {
        base: Array.isArray(modeValue.light)
          ? modeValue.light.map(shadowObjectToCss).join(', ')
          : shadowObjectToCss(modeValue.light),
        _dark: Array.isArray(modeValue.dark)
          ? modeValue.dark.map(shadowObjectToCss).join(', ')
          : shadowObjectToCss(modeValue.dark)
      }
    }
  },
  fontFamily: {
    processValue: (value) => {
      return Array.isArray(value) ? value.join(', ') : value
    },
    processModeValue: (modeValue) => {
      return {
        base: Array.isArray(modeValue.light)
          ? modeValue.light.join(', ')
          : modeValue.light,
        _dark: Array.isArray(modeValue.dark)
          ? modeValue.dark.join(', ')
          : modeValue.dark
      }
    }
  },
  breakpoint: {
    processValue: (value) => value,
    processModeValue: (modeValue) => ({
      base: modeValue.light,
      _dark: modeValue.dark
    })
  },
  // Default processor for token types without specific handling
  default: {
    processValue: (value) => value,
    processModeValue: (modeValue) => ({
      base: modeValue.light,
      _dark: modeValue.dark
    })
  }
}

// Helper function to convert a shadow object to a CSS shadow string
export function shadowObjectToCss(shadowObj) {
  const inset = shadowObj.inset ? 'inset ' : ''
  return `${inset}${shadowObj.offsetX} ${shadowObj.offsetY} ${shadowObj.blurRadius}${
    shadowObj.spreadRadius ? ' ' + shadowObj.spreadRadius : ''
  } ${shadowObj.color}`
}

// Helper function to process a token value based on its type
export function processTokenValue(
  type,
  value,
  hasMode = false,
  modeValue = null
) {
  const processor = tokenProcessors[type] || tokenProcessors.default
  return hasMode
    ? processor.processModeValue(modeValue)
    : processor.processValue(value)
}

// Helper function to process nested token groups
export function processTokenGroup(group, result) {
  for (const [key, value] of Object.entries(group)) {
    if (key.startsWith('$')) continue

    if (typeof value === 'object') {
      if (value.$type && value.$value !== undefined) {
        // This is a token
        if (value.$type === 'breakpoint') {
          // Special handling for breakpoint and textStyle types - assign value directly
          result[key] = value.$value
        } else {
          result[key] = {
            value: processTokenValue(value.$type, value.$value)
          }
          if (value.$description) {
            result[key].description = value.$description
          }
        }
      } else {
        // This is a nested group
        result[key] = {}
        processTokenGroup(value, result[key])
      }
    }
  }
}

// Helper function to process nested semantic token groups
export function processSemanticTokenGroup(group, result) {
  for (const [key, value] of Object.entries(group)) {
    if (key.startsWith('$')) continue

    if (typeof value !== 'object') continue

    if (!value.$type || value.$value === undefined) {
      // This is a nested group
      result[key] = {}
      processSemanticTokenGroup(value, result[key])
      continue
    }

    // This is a semantic token
    const tokenKey = key.toLowerCase() === 'default' ? 'DEFAULT' : key
    const hasMode = !!value.$extensions?.mode

    result[tokenKey] = {
      value: processTokenValue(
        value.$type,
        value.$value,
        hasMode,
        hasMode ? value.$extensions.mode : null
      )
    }

    if (value.$description) {
      result[tokenKey].description = value.$description
    }
  }
}

// Transform function for base tokens
export function transformBaseTokens(tokens) {
  const result = {}

  for (const [tokenType, tokenGroup] of Object.entries(tokens)) {
    if (typeof tokenGroup !== 'object' || !tokenGroup.$type) continue

    result[tokenType] = {}
    processTokenGroup(tokenGroup, result[tokenType])
  }

  return result
}

// Transform function for semantic tokens
export function transformSemanticTokens(tokens) {
  const result = {}

  for (const [tokenType, tokenGroup] of Object.entries(tokens)) {
    if (typeof tokenGroup !== 'object' || !tokenGroup.$type) continue

    result[tokenType] = {}
    processSemanticTokenGroup(tokenGroup, result[tokenType])
  }

  return result
}

// Main execution
if (import.meta.url === `file://${__filename}`) {
  // Read the input files
  const tokensPath = path.join(__dirname, '../src/tokens/tokens.json')
  const semanticTokensPath = path.join(
    __dirname,
    '../src/tokens/semantic-tokens.json'
  )

  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'))
  const semanticTokens = JSON.parse(fs.readFileSync(semanticTokensPath, 'utf8'))

  // Create the final structure
  const finalTokens = {
    tokens: transformBaseTokens(tokens),
    semanticTokens: transformSemanticTokens(semanticTokens)
  }

  // Write the output file
  const outputDir = path.join(__dirname, '../src/tokens/panda')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  const outputPath = path.join(outputDir, 'default.json')
  fs.writeFileSync(outputPath, JSON.stringify(finalTokens, null, 2))

  console.log(
    'Panda tokens transformed successfully! Output written to:',
    outputPath
  )
}
