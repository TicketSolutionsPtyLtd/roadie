import type { TokenManifest } from '../tokens/manifest'

/**
 * A family of classes where a later one replaces an earlier one in `cn()`.
 * Its members are read from core's CSS: the classes a theme namespace makes
 * (`theme`: the variable prefix, then the class prefix to keep), and the
 * `@utility` names that match `utilities`. `conflicts` names the
 * tailwind-merge group it replaces, and is replaced by, in both directions.
 */
type ClassFamilyRule = {
  group: string
  theme?: [variablePrefix: string, classPrefix: string]
  utilities?: RegExp
  conflicts?: string
}

export const CLASS_FAMILY_RULES: readonly ClassFamilyRule[] = [
  { group: 'duration', theme: ['--transition-duration-', 'duration-'] },
  { group: 'ease', theme: ['--ease-', 'ease-'] },
  { group: 'animate', utilities: /^animate-/ },
  { group: 'z', theme: ['--z-index-', 'z-'] },
  // Named stems, so an unrelated `text-*` utility can't join and replace sizes.
  { group: 'font-size', utilities: /^text-(display|ui|prose|code)(-|$)/ },
  {
    group: 'semantic-text-color',
    theme: ['--text-color-', 'text-'],
    conflicts: 'text-color'
  },
  {
    group: 'semantic-bg-color',
    theme: ['--background-color-', 'bg-'],
    utilities: /^surface-/,
    conflicts: 'bg-color'
  },
  {
    group: 'semantic-border-color',
    theme: ['--border-color-', 'border-'],
    conflicts: 'border-color'
  },
  {
    group: 'semantic-outline-color',
    theme: ['--outline-color-', 'outline-'],
    conflicts: 'outline-color'
  },
  { group: 'intent', utilities: /^intent-/ },
  { group: 'emphasis', utilities: /^emphasis-/ },
  { group: 'selection', utilities: /^is-(un)?selected/ },
  { group: 'link', utilities: /^link-/ },
  { group: 'prose-size', utilities: /^prose-/ }
]

export type ClassFamily = {
  group: string
  members: string[]
  conflicts?: string
}

/** Each family's members, read from a parsed token manifest of core's CSS. */
export function classFamilies(
  { tokens }: Pick<TokenManifest, 'tokens'>,
  rules: readonly ClassFamilyRule[] = CLASS_FAMILY_RULES
): ClassFamily[] {
  return rules.map(({ group, theme, utilities, conflicts }) => {
    const members = tokens.flatMap((token) => {
      if (theme && token.kind === 'variable' && token.source === 'roadie') {
        const [variablePrefix, classPrefix] = theme
        if (!token.name.startsWith(variablePrefix)) return []
        return (token.classes ?? []).filter((c) => c.startsWith(classPrefix))
      }
      // A functional `@utility name-*` is a pattern, not a class to list.
      if (
        utilities &&
        token.kind === 'utility' &&
        !token.name.endsWith('*') &&
        utilities.test(token.name)
      )
        return [token.name]
      return []
    })
    return { group, members: [...new Set(members)], conflicts }
  })
}

const HEADER =
  'Generated from core’s CSS by src/utils/classFamilies.test.ts, over the rules in src/utils/classFamilies.ts. Run pnpm --filter @oztix/roadie-core test -u after changing a family’s CSS.'

const quote = (s: string) => (/^[a-z]+$/.test(s) ? s : `'${s}'`)
const list = (items: string[], indent: string) =>
  `[\n${items.map((item) => `${indent}  '${item}'`).join(',\n')}\n${indent}]`

/** The `cn()` groups and their two-way conflicts, as a TypeScript module. */
export function renderClassGroups(families: ClassFamily[]) {
  const groups = families
    .map(({ group, members }) => `  ${quote(group)}: ${list(members, '  ')}`)
    .join(',\n')
  const conflicts = families
    .flatMap(({ group, conflicts: other }) =>
      other
        ? [`  ${quote(group)}: ['${other}']`, `  ${quote(other)}: ['${group}']`]
        : []
    )
    .join(',\n')
  return `// ${HEADER}
import type { DefaultClassGroupIds } from 'tailwind-merge'

export type RoadieClassGroupIds =
${families.map(({ group }) => `  | '${group}'`).join('\n')}

type GroupId = RoadieClassGroupIds | DefaultClassGroupIds

export const classGroups: Record<RoadieClassGroupIds, string[]> = {
${groups}
}

// Both ways, so the later class wins whichever family each comes from.
export const conflictingClassGroups: Partial<Record<GroupId, GroupId[]>> = {
${conflicts}
}
`
}

/** One `<div>` per family, for Tailwind to compile into roadie.compiled.css. */
export function renderFamilySafelist(families: ClassFamily[]) {
  return `<!-- ${HEADER} -->
${families.map(({ members }) => `<div class="${members.join(' ')}"></div>`).join('\n')}
`
}
