import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read the input files
const tokensPath = path.join(__dirname, '../src/tokens/tokens.json')
const semanticTokensPath = path.join(
  __dirname,
  '../src/tokens/semantic-tokens.json'
)

const semanticTokens = JSON.parse(fs.readFileSync(semanticTokensPath, 'utf8'))

// Ensure the figma directory exists
const figmaDir = path.join(__dirname, '../src/tokens/figma')
if (!fs.existsSync(figmaDir)) {
  fs.mkdirSync(figmaDir, { recursive: true })
}

// Copy tokens.json to figma directory
fs.writeFileSync(
  path.join(figmaDir, 'tokens.json'),
  fs.readFileSync(tokensPath, 'utf8')
)

// Helper function to process semantic tokens for light/dark mode
function processSemanticTokens(tokens, mode = 'light') {
  const result = {}

  for (const [tokenType, tokenGroup] of Object.entries(tokens)) {
    if (typeof tokenGroup !== 'object' || !tokenGroup.$type) continue

    result[tokenType] = {
      $type: tokenGroup.$type
    }

    for (const [key, value] of Object.entries(tokenGroup)) {
      if (key.startsWith('$')) continue

      if (typeof value === 'object') {
        if (value.$type && value.$value !== undefined) {
          // This is a semantic token
          const tokenKey = key
          if (value.$extensions?.mode) {
            // Token has light/dark modes
            result[tokenType][tokenKey] = {
              $type: value.$type,
              $value: value.$extensions.mode[mode]
            }
            if (value.$description) {
              result[tokenType][tokenKey].$description = value.$description
            }
          } else {
            // Token has a single value
            result[tokenType][tokenKey] = {
              $type: value.$type,
              $value: value.$value
            }
            if (value.$description) {
              result[tokenType][tokenKey].$description = value.$description
            }
          }
        } else {
          // This is a nested group
          result[tokenType][key] = processSemanticTokens(
            { [key]: value },
            mode
          )[key]
        }
      }
    }
  }

  return result
}

// Generate light and dark semantic tokens
const lightTokens = processSemanticTokens(semanticTokens, 'light')
const darkTokens = processSemanticTokens(semanticTokens, 'dark')

// Write the semantic token files
fs.writeFileSync(
  path.join(figmaDir, 'mode-tokens-light.json'),
  JSON.stringify(lightTokens, null, 2)
)
fs.writeFileSync(
  path.join(figmaDir, 'mode-tokens-dark.json'),
  JSON.stringify(darkTokens, null, 2)
)

console.log('Figma tokens built successfully! Files written to:', figmaDir)
