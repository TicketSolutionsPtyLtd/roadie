import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  type ComponentDoc,
  type PropItem,
  withCompilerOptions
} from 'react-docgen-typescript'
import type ts from 'typescript'

import { programFor } from './exports.ts'
import { unwrap } from './text.ts'

export type ManifestProp = {
  name: string
  type: string
  required?: true
  default?: string
  description?: string
  deprecated?: string
  from?: string
}

export type ManifestPart = {
  name: string
  description?: string
  deprecated?: string
  props: ManifestProp[]
}

const SKIPPED_PROPS = new Set([
  'ref',
  'key',
  'style',
  'dangerouslySetInnerHTML'
])
const OUR_SOURCES = /(^|\/)(components|widgets|charts)\//

function isOurs(fileName: string | undefined) {
  return (
    !!fileName &&
    !fileName.includes('node_modules') &&
    OUR_SOURCES.test(fileName)
  )
}

function keepProp(prop: PropItem) {
  if (SKIPPED_PROPS.has(prop.name)) return false
  if (prop.name === 'className') return true
  if (!prop.declarations?.length) return true
  return (
    prop.declarations.some((d) => isOurs(d.fileName)) ||
    isOurs(prop.parent?.fileName) ||
    !!prop.parent?.fileName.includes('@base-ui/react')
  )
}

export function createDocgenParser(program: ts.Program) {
  return withCompilerOptions(program.getCompilerOptions(), {
    savePropValueAsString: true,
    shouldExtractLiteralValuesFromEnum: true,
    shouldRemoveUndefinedFromOptional: true,
    skipChildrenPropWithoutDoc: true,
    propFilter: keepProp
  })
}

export function formatType(type: PropItem['type']) {
  if (type.value && Array.isArray(type.value)) {
    return (type.value as { value: string }[])
      .map((v) => v.value.replace(/^(['"])(.*)\1$/, '"$2"'))
      .join(' | ')
  }
  if (type.name.includes('|')) {
    return type.name
      .split('|')
      .map((value) => value.trim())
      .filter((value) => value !== 'undefined')
      .join(' | ')
  }
  return type.name
}

// A block tag opens its line; `@deprecated` mid-sentence is prose.
const DEPRECATED_TAG = /^[ \t]*@deprecated\b/m

export function splitDeprecation(
  description: string,
  tags: Record<string, string> | undefined
): { description: string; deprecated?: string } {
  const tag = DEPRECATED_TAG.exec(description)
  if (!tag) {
    return tags && 'deprecated' in tags
      ? {
          description: unwrap(description),
          deprecated: unwrap(tags.deprecated ?? '')
        }
      : { description: unwrap(description) }
  }
  const after = description.slice(tag.index + tag[0].length)
  const end = after.indexOf('\n\n')
  return {
    deprecated: unwrap(end === -1 ? after : after.slice(0, end)),
    description: unwrap(
      description.slice(0, tag.index) + (end === -1 ? '' : after.slice(end))
    )
  }
}

function toProp(prop: PropItem, componentName: string): ManifestProp | null {
  const isForwardedClassName =
    prop.name === 'className' &&
    !!prop.parent?.fileName.includes('@types/react') &&
    prop.type.name === 'string' &&
    !prop.description
  if (isForwardedClassName) return null

  const { description, deprecated } = splitDeprecation(
    prop.description ?? '',
    (prop as PropItem & { tags?: Record<string, string> }).tags
  )
  const parent = prop.parent?.name
  return {
    name: prop.name,
    type: formatType(prop.type),
    ...(prop.required && { required: true as const }),
    ...(prop.defaultValue?.value !== undefined && {
      default: String(prop.defaultValue.value)
    }),
    ...(description && { description }),
    ...(deprecated !== undefined && { deprecated }),
    ...(parent && !parent.startsWith(componentName) && { from: parent })
  }
}

function publicPartsOf(indexFile: string, compound: string) {
  const assignment = new RegExp(`^${compound}\\.([A-Z]\\w*)\\s*=`, 'gm')
  return new Set(
    Array.from(
      readFileSync(indexFile, 'utf8').matchAll(assignment),
      (match) => match[1]!
    )
  )
}

export function componentFiles(entryFile: string) {
  const dir = path.dirname(entryFile)
  return readdirSync(dir)
    .filter((name) => name.endsWith('.tsx') && !name.includes('.test.'))
    .sort()
    .map((name) => path.join(dir, name))
}

export function namedDocs(
  docs: ComponentDoc[],
  compound: string,
  exportedValues: Set<string>,
  publicParts: Set<string>
) {
  const prefix = `${compound}.`
  const renamed = docs
    .filter((doc) => /^[A-Z]/.test(doc.displayName))
    .flatMap((doc) => {
      const name = doc.displayName
      if (name === compound || name.includes('.')) return [doc]
      if (!name.startsWith(compound)) return [doc]
      const suffix = name.slice(compound.length)
      if (!/^[A-Z]/.test(suffix) || suffix === 'Root') return [doc]
      return [{ ...doc, displayName: `${prefix}${suffix}` }]
    })

  const byKey = new Map<string, ComponentDoc>()
  for (const doc of renamed) {
    const key = doc.displayName.replace(/\./g, '').toLowerCase()
    const existing = byKey.get(key)
    if (
      !existing ||
      (doc.displayName.includes('.') && !existing.displayName.includes('.'))
    ) {
      byKey.set(key, doc)
    }
  }

  const hasBareRoot = byKey.has(compound.toLowerCase())
  return Array.from(byKey.values()).filter((doc) => {
    const name = doc.displayName
    if (hasBareRoot && name === `${prefix}Root`) return false
    if (!name.includes('.')) return exportedValues.has(name)
    const [root, ...rest] = name.split('.')
    return (
      root === compound &&
      exportedValues.has(root) &&
      publicParts.has(rest.join('.'))
    )
  })
}

export function toPart(doc: ComponentDoc): ManifestPart {
  const { description, deprecated } = splitDeprecation(
    doc.description,
    doc.tags as Record<string, string> | undefined
  )
  return {
    name: doc.displayName,
    ...(description && { description }),
    ...(deprecated !== undefined && { deprecated }),
    props: Object.values(doc.props)
      .map((prop) => toProp(prop, doc.displayName))
      .filter((prop): prop is ManifestProp => prop !== null)
  }
}

export function readComponents(
  parser: ReturnType<typeof createDocgenParser>,
  program: ts.Program,
  entryFile: string,
  exportedValues: Set<string>
): ManifestPart[] {
  const compound = path.basename(path.dirname(entryFile))
  const publicParts = publicPartsOf(entryFile, compound)
  const parts = namedDocs(
    parser.parseWithProgramProvider(componentFiles(entryFile), () =>
      programFor(program, componentFiles(entryFile))
    ),
    compound,
    exportedValues,
    publicParts
  ).map(toPart)

  const documented = new Set(parts.map((part) => part.name))
  const missing = [...publicParts].filter(
    (part) => part !== 'Root' && !documented.has(`${compound}.${part}`)
  )
  if (exportedValues.has(compound) && missing.length > 0) {
    throw new Error(
      `react-docgen-typescript found no docs for ${missing
        .map((part) => `${compound}.${part}`)
        .join(', ')}. Declare ${compound} as a function and assign its parts.`
    )
  }
  return parts
}

export function readFileComponents(
  parser: ReturnType<typeof createDocgenParser>,
  program: ts.Program,
  files: string[],
  names: Set<string>
): ManifestPart[] {
  return parser
    .parseWithProgramProvider(files, () => programFor(program, files))
    .filter((doc) => names.has(doc.displayName))
    .map(toPart)
}
