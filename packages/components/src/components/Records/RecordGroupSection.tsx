'use client'

import { type ReactNode, useCallback, useId, useMemo, useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { surfaceClass } from '../../utils/surface'
import { Accordion } from '../Accordion'
import { listGroupTitleVariants, listGroupVariants } from '../List/variants'
import type { RecordGroup } from './groups'

/** A group's records, as a list or grid labelled by the group's title. */
export type GroupLeaf = (group: RecordGroup, titleId: string) => ReactNode

type GroupCollapse = {
  /** Paths of the collapsed groups. */
  closed: ReadonlySet<string>
  setOpen: (path: string, open: boolean) => void
}

type Toggle = (id: string, range: boolean, order?: readonly string[]) => void

/**
 * The groups with records, the session's collapsed groups, and `onToggle`
 * with a Shift range in the order the groups show their records.
 */
export function useRecordGroups(
  groups: readonly RecordGroup[],
  onToggle: Toggle
) {
  // Collapsed groups by path: the session's, never the view's.
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set())
  const shown = useMemo(() => shownGroups(groups), [groups])
  // A range skips the records of a collapsed group, as they aren't on screen.
  const order = useMemo(() => shownOrder(shown, closed), [shown, closed])
  const collapse = useMemo<GroupCollapse>(
    () => ({
      closed,
      setOpen: (path, open) =>
        setClosed((was) => {
          const next = new Set(was)
          if (open) next.delete(path)
          else next.add(path)
          return next
        })
    }),
    [closed]
  )
  const toggle = useCallback(
    (id: string, range: boolean) => onToggle(id, range, order),
    [onToggle, order]
  )
  return { shown, collapse, onToggle: toggle }
}

/** The list around the outermost groups. */
export const groupedBodyClass = (headings: boolean) => [
  'grid [&>li:first-child]:mt-0 [&>li:first-child]:border-t-0 [&>li:first-child]:pt-0',
  // A title's focus ring draws above it, clear of a sticky toolbar.
  headings && 'pt-1.5'
]

// Groups with records, at every level, so an empty option is left out.
function shownGroups(groups: readonly RecordGroup[]): RecordGroup[] {
  return groups.flatMap((group) =>
    group.rows.length === 0
      ? []
      : [group.groups ? { ...group, groups: shownGroups(group.groups) } : group]
  )
}

// A group's place in the tree, by each level's field and value, so another
// grouping never inherits its open state.
const groupPath = (parent: string, group: RecordGroup) =>
  `${parent}/${JSON.stringify([group.field?.key ?? null, group.key])}`

// The ids in the order the innermost groups show them, which a nested group
// can reorder from its outer group's rows, leaving out collapsed groups.
function shownOrder(
  groups: readonly RecordGroup[],
  closed: ReadonlySet<string>,
  parent = ''
): string[] {
  return groups.flatMap((group) => {
    const path = groupPath(parent, group)
    if (closed.has(path)) return []
    return group.groups
      ? shownOrder(group.groups, closed, path)
      : group.rows.map(({ id }) => id)
  })
}

const groupHeadings = ['h2', 'h3', 'h4'] as const

// Each level is its own tier of heading, largest outermost, whatever follows
// it; a third level keeps the quiet group title.
const titleTiers = [
  'text-display-ui-4 text-strong',
  'text-display-ui-6 text-strong'
]

/**
 * A group of records under its title and count, holding its inner groups or
 * its `leaf`. With `headings`, titles are tiers of heading by level with a
 * rule between outer groups, and each group collapses from its title.
 */
export function RecordGroupSection({
  group,
  leaf,
  collapse,
  headings = false,
  bleed = false,
  outerRing = false,
  stickyTop,
  depth = 0,
  parent = ''
}: {
  group: RecordGroup
  leaf: GroupLeaf
  collapse: GroupCollapse
  headings?: boolean
  /** Records reach into the space beside them; titles line up with theirs. */
  bleed?: boolean
  /** Records draw their focus ring outside their box, as cards do. */
  outerRing?: boolean
  /** Outermost titles stick at this `top` as their records scroll by. */
  stickyTop?: string
  depth?: number
  /** The outer group's path. */
  parent?: string
}) {
  const titleId = useId()
  const path = groupPath(parent, group)
  const Heading = groupHeadings[Math.min(depth, groupHeadings.length - 1)]!
  // Only the outermost titles stick, so nested ones don't stack under them.
  const sticky = depth === 0 ? stickyTop : undefined
  const className = cn(
    listGroupVariants(),
    // An outer group's siblings part with a rule; inner ones sit closer.
    headings && depth === 0 && 'gap-3 border-t border-subtler pt-6',
    depth > 0 && 'mt-4'
  )
  const heading = (
    <Heading
      id={titleId}
      data-slot='list-group-title'
      className={cn(
        listGroupTitleVariants(),
        headings && [titleTiers[depth], 'px-0'],
        'flex gap-1.5',
        !headings && bleed && '-mx-3',
        sticky !== undefined && ['sticky z-1 py-1', surfaceClass]
      )}
      style={sticky === undefined ? undefined : { top: sticky }}
    >
      {group.label}{' '}
      <span
        className={cn('font-normal tabular-nums', headings && 'text-subtle')}
      >
        {group.rows.length}
      </span>
    </Heading>
  )
  const body = group.groups ? (
    <ul
      role='list'
      aria-labelledby={titleId}
      className='grid [&>li:first-child]:mt-0'
    >
      {group.groups.map((inner) => (
        <RecordGroupSection
          key={inner.key ?? ''}
          group={inner}
          leaf={leaf}
          collapse={collapse}
          headings={headings}
          bleed={bleed}
          outerRing={outerRing}
          depth={depth + 1}
          parent={path}
        />
      ))}
    </ul>
  ) : (
    leaf(group, titleId)
  )
  if (!headings)
    return (
      <li data-slot='list-group' className={className}>
        {heading}
        {body}
      </li>
    )
  const extra = group.field?.groupHeading?.({
    value: group.key,
    label: group.label,
    count: group.rows.length
  })
  const open = !collapse.closed.has(path)
  // An Accordion item per group: its summary holds the heading, so the whole
  // title row opens and closes it. Heading content can hold links, which a
  // summary can't, so it follows the summary and hides with the group.
  return (
    <li data-slot='list-group' className={className}>
      <Accordion.Item
        open={open}
        onToggle={(event) => {
          const now = event.currentTarget.open
          if (now !== open) collapse.setOpen(path, now)
        }}
        className={cn(
          'grid',
          // Its content slot clips as it animates, so it reaches as far as
          // the rows' bleed, or an inner title's hover fill is cut. A card's
          // ring gets room beside it, and above it inside the slot, so a
          // closed group shows none of it.
          outerRing ? 'gap-0.5' : 'gap-1.5',
          bleed && 'details-content:-mx-3 details-content:px-3',
          outerRing && 'details-content:-mx-1 details-content:px-1'
        )}
      >
        <Accordion.Trigger
          className={cn(
            // Auto width, so the bleed widens the row as a record row's does,
            // and a border like a row's, so the title's text lines up with theirs.
            'w-auto gap-3 rounded-lg border px-3 py-1',
            bleed && '-mx-3'
          )}
        >
          {heading}
        </Accordion.Trigger>
        <Accordion.Content
          className={cn(
            'grid gap-1.5 p-0',
            bleed && '-mx-3 px-3',
            outerRing && '-mx-1 p-1'
          )}
        >
          {extra != null && extra !== false && (
            // A pixel in, as a row's border sets its text.
            <div
              data-slot='list-group-heading'
              className='px-px text-sm text-subtle'
            >
              {extra}
            </div>
          )}
          {body}
        </Accordion.Content>
      </Accordion.Item>
    </li>
  )
}
