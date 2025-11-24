#!/usr/bin/env node

/**
 * Script to convert SVG files into SpotIllustration components
 *
 * Usage:
 *   pnpm build:spotillustration                    # Build all SVGs in svgs/ directory
 *   pnpm build:spotillustration <svg-file-path>    # Build a specific SVG file
 *   pnpm build:spotillustration --watch            # Watch for changes and auto-rebuild
 *   pnpm build:spotillustration --no-optimize      # Skip SVGO optimization
 *
 * Examples:
 *   pnpm build:spotillustration
 *   pnpm build:spotillustration src/components/SpotIllustration/svgs/heart.svg
 *   pnpm build:spotillustration --watch
 *   pnpm build:spotillustration --watch --no-optimize
 *
 * This script:
 * 1. Optimizes SVG files using SVGO (unless --no-optimize flag is passed)
 * 2. Categorizes SVG paths into layers (face, detail, shadow, highlight, stroke, outline)
 *    by matching fill/stroke colors against semantic illustration tokens
 * 3. Generates JSON files in the json/ directory
 * 4. Generates React TypeScript component files
 * 5. Automatically updates index.tsx with component exports
 * 6. Adds "do not edit" warnings to generated files
 *
 * Watch mode (--watch) monitors the svgs/ directory and automatically rebuilds
 * when SVG files are added or modified during development.
 *
 * Figma exports can be processed directly - the script handles optimization.
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { optimize } = require('svgo')

// Path to tokens files
const SEMANTIC_TOKENS_PATH = path.join(
  __dirname,
  '../../core/src/tokens/semantic-tokens.json'
)
const BASE_TOKENS_PATH = path.join(
  __dirname,
  '../../core/src/tokens/tokens.json'
)

// Load semantic tokens to get actual color values
function loadIllustrationTokens() {
  try {
    const semanticTokens = JSON.parse(
      fs.readFileSync(SEMANTIC_TOKENS_PATH, 'utf-8')
    )
    const baseTokens = JSON.parse(fs.readFileSync(BASE_TOKENS_PATH, 'utf-8'))
    const illustrations = semanticTokens.colors.illustrations

    // Resolve token references like {colors.purple.5}
    function resolveTokenValue(value) {
      if (typeof value !== 'string') return value
      const match = value.match(/\{colors\.(\w+)\.(\w+)\}/)
      if (match) {
        const [, colorName, shade] = match
        return baseTokens.colors[colorName]?.[shade]?.$value || value
      }
      return value
    }

    return {
      face: resolveTokenValue(illustrations.face.$value),
      detail: resolveTokenValue(illustrations.detail.$value),
      shadow: resolveTokenValue(illustrations.shadow.$value),
      highlight: resolveTokenValue(illustrations.highlight.$value),
      stroke: resolveTokenValue(illustrations.stroke.$value),
      outline: resolveTokenValue(illustrations.outline.$value)
    }
  } catch (error) {
    console.warn(
      'Warning: Could not load semantic tokens, using fallback colors:',
      error.message
    )
    // Fallback colors
    return {
      face: '#E1D1FB',
      detail: '#FFC3A8',
      shadow: '#0091EB',
      highlight: '#A7D8FF',
      stroke: '#1A1F2B',
      outline: '#ffffff'
    }
  }
}

// Color mapping helpers
function normalizeColor(color) {
  if (!color || color === 'none') return null
  let normalized = color.toLowerCase().replace(/\s+/g, '')

  // Expand short hex codes like #fff to #ffffff
  if (normalized.match(/^#[0-9a-f]{3}$/)) {
    normalized =
      '#' +
      normalized[1] +
      normalized[1] +
      normalized[2] +
      normalized[2] +
      normalized[3] +
      normalized[3]
  }

  return normalized
}

function colorDistance(color1, color2) {
  // Simple hex color distance (good enough for this use case)
  if (!color1 || !color2) return Infinity

  const c1 = normalizeColor(color1).replace('#', '')
  const c2 = normalizeColor(color2).replace('#', '')

  if (c1.length !== 6 || c2.length !== 6) return Infinity

  const r1 = parseInt(c1.substr(0, 2), 16)
  const g1 = parseInt(c1.substr(2, 2), 16)
  const b1 = parseInt(c1.substr(4, 2), 16)

  const r2 = parseInt(c2.substr(0, 2), 16)
  const g2 = parseInt(c2.substr(2, 2), 16)
  const b2 = parseInt(c2.substr(4, 2), 16)

  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function categorizeByColor(fill, stroke, illustrationTokens) {
  const fillNorm = normalizeColor(fill)
  const strokeNorm = normalizeColor(stroke)

  // Stroke layer - has stroke defined and not filling
  if (
    strokeNorm &&
    strokeNorm !== 'none' &&
    (!fillNorm || fillNorm === 'none')
  ) {
    return 'stroke'
  }

  // If no fill, skip
  if (!fillNorm || fillNorm === 'none') {
    return null
  }

  // Find closest matching token color
  const tokenColors = {
    outline: illustrationTokens.outline,
    face: illustrationTokens.face,
    detail: illustrationTokens.detail,
    shadow: illustrationTokens.shadow,
    highlight: illustrationTokens.highlight
  }

  let closestLayer = 'face'
  let closestDistance = Infinity

  for (const [layer, tokenColor] of Object.entries(tokenColors)) {
    const distance = colorDistance(fillNorm, tokenColor)
    if (distance < closestDistance) {
      closestDistance = distance
      closestLayer = layer
    }
  }

  // If distance is too large (> 100), default to face
  if (closestDistance > 100) {
    console.log(
      `  Warning: No close match for color ${fill}, defaulting to face`
    )
    return 'face'
  }

  return closestLayer
}

function extractPaths(svgContent, illustrationTokens) {
  const paths = []

  // Match all path elements
  const pathRegex = /<path[^>]*>/g
  const pathTags = svgContent.match(pathRegex) || []

  pathTags.forEach((pathTag) => {
    // Extract attributes
    const dMatch = pathTag.match(/d=['"]([^'"]+)['"]/)
    const fillMatch = pathTag.match(/fill=['"]([^'"]+)['"]/)
    const strokeMatch = pathTag.match(/stroke=['"]([^'"]+)['"]/)

    if (!dMatch) return

    // Categorize the path to determine its layer type
    const layer = categorizeByColor(
      fillMatch ? fillMatch[1] : null,
      strokeMatch ? strokeMatch[1] : null,
      illustrationTokens
    )

    if (!layer) return

    const pathData = {
      d: dMatch[1],
      layer
    }

    paths.push(pathData)
  })

  return paths
}

function optimizeSvg(svgContent) {
  const result = optimize(svgContent, {
    plugins: [
      // Basic cleanup
      'removeDoctype',
      'removeXMLProcInst',
      'removeComments',
      'removeMetadata',
      'removeEditorsNSData',
      'cleanupAttrs',
      'mergeStyles',
      'inlineStyles',
      'minifyStyles',
      'cleanupIds',
      'removeUselessDefs',
      'cleanupNumericValues',
      'convertColors',
      'removeUnknownsAndDefaults',
      'removeNonInheritableGroupAttrs',
      // DON'T remove "useless" fills/strokes - we need them for categorization
      // 'removeUselessStrokeAndFill',
      'cleanupEnableBackground',
      // DON'T remove hidden elements - Figma exports have fill="none" on root svg
      // 'removeHiddenElems',
      'removeEmptyText',
      'convertShapeToPath',
      'convertEllipseToCircle',
      'moveElemsAttrsToGroup',
      'moveGroupAttrsToElems',
      'collapseGroups',
      {
        name: 'convertPathData',
        params: {
          floatPrecision: 3
        }
      },
      'convertTransform',
      'removeEmptyAttrs',
      'removeEmptyContainers',
      // DON'T merge paths - we need to categorize them individually
      // 'mergePaths',
      'removeUnusedNS',
      'sortDefsChildren',
      'removeTitle',
      'removeDesc',
      // Remove width/height but keep viewBox
      'removeDimensions'
    ]
  })
  return result.data
}

function kebabToPascal(str) {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

function generateComponent(basename) {
  const componentName = kebabToPascal(basename)
  const dataVarName = basename.replace(/-/g, '')

  return `// Generated file - do not edit directly
import { createSpotIllustration } from './createSpotIllustration'
import ${dataVarName}Data from './json/${basename}.json'

export const ${componentName} = createSpotIllustration('${componentName}', ${dataVarName}Data)
export type ${componentName}Props = React.ComponentPropsWithRef<typeof ${componentName}>
`
}

function svgToJson(svgFilePath, shouldOptimize = true) {
  // Load illustration tokens
  const illustrationTokens = loadIllustrationTokens()

  console.log('\nUsing semantic token colors:')
  Object.entries(illustrationTokens).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })
  console.log('')

  // Read SVG file
  let svgContent = fs.readFileSync(svgFilePath, 'utf-8')

  // Validate SVG content
  if (!svgContent.trim()) {
    throw new Error('SVG file is empty')
  }

  if (!svgContent.includes('<svg')) {
    throw new Error('File does not contain valid SVG content')
  }

  // Optimize SVG if requested
  if (shouldOptimize) {
    console.log('Optimizing SVG with SVGO...')
    svgContent = optimizeSvg(svgContent)
    console.log('✓ SVG optimized\n')
  }

  // Extract viewBox
  const viewBoxMatch = svgContent.match(/viewBox=['"]([^'"]+)['"]/)

  // Extract paths in order
  const paths = extractPaths(svgContent, illustrationTokens)

  // Build JSON structure
  const json = {
    viewBox: viewBoxMatch ? viewBoxMatch[1] : '0 0 48 48',
    paths
  }

  return json
}

function formatGeneratedFiles(componentDir) {
  try {
    // Get all generated TypeScript files
    const files = fs
      .readdirSync(componentDir)
      .filter(
        (file) =>
          file.endsWith('.tsx') &&
          file !== 'index.tsx' &&
          file !== 'SpotIllustration.tsx' &&
          file !== 'createSpotIllustration.tsx'
      )

    if (files.length === 0) return

    // Build file paths
    const filePaths = files.map((file) => path.join(componentDir, file))

    // Run prettier on all generated files
    execFileSync('npx', ['prettier', '--write', ...filePaths], {
      cwd: path.join(__dirname, '..'),
      stdio: 'ignore'
    })

    return true
  } catch (error) {
    console.warn(`  ⚠ Warning: Could not format files: ${error.message}`)
    return false
  }
}

function updateIndexExports(componentDir) {
  const indexPath = path.join(componentDir, 'index.tsx')

  if (!fs.existsSync(indexPath)) {
    console.log('  ⚠ index.tsx not found, skipping export update')
    return
  }

  // Read current index file
  let indexContent = fs.readFileSync(indexPath, 'utf-8')

  // Find all component files (excluding base components)
  const componentFiles = fs
    .readdirSync(componentDir)
    .filter(
      (file) =>
        file.endsWith('.tsx') &&
        file !== 'index.tsx' &&
        file !== 'SpotIllustration.tsx' &&
        file !== 'createSpotIllustration.tsx'
    )
    .sort()

  // Generate export statements for each component
  const componentExports = componentFiles
    .map((file) => {
      const componentName = path.basename(file, '.tsx')
      return `export { ${componentName} } from './${componentName}'\nexport type { ${componentName}Props } from './${componentName}'`
    })
    .join('\n\n') // Each component gets its own group separated by blank line

  // Check if we need to update (find the section after createSpotIllustration exports)
  const baseExportsEnd = indexContent.indexOf(
    "export type { SpotIllustrationComponentProps } from './createSpotIllustration'"
  )

  if (baseExportsEnd === -1) {
    console.log(
      '  ⚠ Could not find base exports in index.tsx, skipping update'
    )
    return
  }

  // Find the end of that line
  const insertPosition = indexContent.indexOf('\n', baseExportsEnd) + 1

  // Build new content with base exports, comment, and component exports
  const baseContent = indexContent.substring(0, insertPosition)
  const generatedSection =
    componentExports.length > 0
      ? '\n// Generated exports - do not edit manually\n' +
        componentExports +
        '\n'
      : '\n'

  const newContent = baseContent + generatedSection

  // Only write if content changed
  if (newContent !== indexContent) {
    fs.writeFileSync(indexPath, newContent)
    return true
  }

  return false
}

function processFile(svgPath, shouldOptimize) {
  const json = svgToJson(svgPath, shouldOptimize)
  const basename = path.basename(svgPath, '.svg')
  const dirname = path.dirname(svgPath)
  const jsonDir = path.join(dirname, '..', 'json')
  const componentDir = path.join(dirname, '..')

  // Create json directory if it doesn't exist
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true })
  }

  const outputPath = path.join(jsonDir, `${basename}.json`)

  // Write JSON file with comment
  const jsonWithComment = {
    $comment: 'Generated file - do not edit directly',
    ...json
  }
  fs.writeFileSync(outputPath, JSON.stringify(jsonWithComment, null, 2) + '\n')

  // Generate React component
  const componentPath = path.join(
    componentDir,
    `${kebabToPascal(basename)}.tsx`
  )
  const componentCode = generateComponent(basename)
  fs.writeFileSync(componentPath, componentCode)

  return { basename, pathCount: json.paths.length, componentDir }
}

function buildAllSvgs(svgsDir, shouldOptimize) {
  const svgFiles = fs
    .readdirSync(svgsDir)
    .filter((file) => file.endsWith('.svg'))

  if (svgFiles.length === 0) {
    console.log('No SVG files found in', svgsDir)
    return { successCount: 0, errorCount: 0 }
  }

  console.log(`\nFound ${svgFiles.length} SVG file(s). Building all...\n`)

  let successCount = 0
  let errorCount = 0
  let componentDir = null

  svgFiles.forEach((file, index) => {
    const svgPath = path.join(svgsDir, file)
    console.log(`[${index + 1}/${svgFiles.length}] Processing ${file}...`)

    try {
      const result = processFile(svgPath, shouldOptimize)
      componentDir = result.componentDir
      console.log(
        `✓ ${file} → ${result.basename}.json + ${kebabToPascal(result.basename)}.tsx (${result.pathCount} paths)\n`
      )
      successCount++
    } catch (error) {
      console.error(`✗ Error processing ${file}: ${error.message}\n`)
      errorCount++
    }
  })

  console.log(`\nCompleted: ${successCount} successful, ${errorCount} failed`)

  // Update index.tsx exports if we processed any files
  if (successCount > 0 && componentDir) {
    console.log('\nUpdating index.tsx exports...')
    const updated = updateIndexExports(componentDir)
    if (updated) {
      console.log('✓ index.tsx updated with new exports')
    } else {
      console.log('✓ index.tsx already up to date')
    }

    // Format all generated files with Prettier
    console.log('Formatting generated files with Prettier...')
    const formatted = formatGeneratedFiles(componentDir)
    if (formatted) {
      console.log('✓ All files formatted\n')
    } else {
      console.log()
    }
  }

  return { successCount, errorCount }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2)
  const shouldOptimize = !args.includes('--no-optimize')
  const watchMode = args.includes('--watch')

  // Filter out flag arguments to get actual file path
  const filePath = args.find((arg) => !arg.startsWith('--'))

  // If no file specified, build all SVGs in the svgs directory
  if (!filePath) {
    const svgsDir = path.join(
      __dirname,
      '../src/components/SpotIllustration/svgs'
    )

    if (!fs.existsSync(svgsDir)) {
      console.error(`Error: SVGs directory not found: ${svgsDir}`)
      process.exit(1)
    }

    const { errorCount } = buildAllSvgs(svgsDir, shouldOptimize)

    if (watchMode) {
      console.log('\n👀 Watching for changes...\n')

      fs.watch(svgsDir, { recursive: false }, (eventType, filename) => {
        if (!filename || !filename.endsWith('.svg')) return

        const svgPath = path.join(svgsDir, filename)

        // Debounce rapid changes and wait for file to be fully written
        clearTimeout(watchMode.debounceTimer)
        watchMode.debounceTimer = setTimeout(() => {
          console.log(`\n📝 Change detected: ${filename}`)

          if (!fs.existsSync(svgPath)) {
            console.log(`   File removed, skipping...`)
            return
          }

          // Check if file has content (wait for write to complete)
          const stats = fs.statSync(svgPath)
          if (stats.size === 0) {
            console.log(`   File is empty, waiting for content...\n`)
            return
          }

          try {
            const result = processFile(svgPath, shouldOptimize)
            console.log(
              `✓ ${filename} → ${result.basename}.json + ${kebabToPascal(result.basename)}.tsx (${result.pathCount} paths)`
            )

            // Update index.tsx exports
            const updated = updateIndexExports(result.componentDir)
            if (updated) {
              console.log('✓ index.tsx updated')
            }

            // Format the generated file
            formatGeneratedFiles(result.componentDir)
            console.log('✓ Files formatted\n')
          } catch (error) {
            console.error(`✗ Error processing ${filename}: ${error.message}\n`)
          }
        }, 300)
      })
    } else {
      process.exit(errorCount > 0 ? 1 : 0)
    }
  } else {
    // Single file mode
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`)
      process.exit(1)
    }

    try {
      const result = processFile(filePath, shouldOptimize)

      console.log(`✓ Successfully converted ${filePath}`)
      console.log(`✓ JSON written to json/${result.basename}.json`)
      console.log(
        `✓ Component written to ${kebabToPascal(result.basename)}.tsx`
      )
      console.log(`\nTotal paths: ${result.pathCount}`)

      // Update index.tsx exports
      console.log('\nUpdating index.tsx exports...')
      const updated = updateIndexExports(result.componentDir)
      if (updated) {
        console.log('✓ index.tsx updated with new exports')
      } else {
        console.log('✓ index.tsx already up to date')
      }

      // Format the generated file
      console.log('Formatting generated files with Prettier...')
      const formatted = formatGeneratedFiles(result.componentDir)
      if (formatted) {
        console.log('✓ Files formatted')
      }
    } catch (error) {
      console.error(`Error converting SVG: ${error.message}`)
      process.exit(1)
    }
  }
}

module.exports = { svgToJson, extractPaths, categorizeByColor }
