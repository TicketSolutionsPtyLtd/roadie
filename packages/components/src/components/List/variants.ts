import { cva } from 'class-variance-authority'

// `:focus-visible`, not `:focus-within`, which a click leaves behind.
// Child combinators stop a nested `List.Group` matching as a loose row.
export const listSectionClass = [
  // Buttons shrink-wrap even as block flex; a width would break the -mx bleed.
  'grid [&>li]:grid',
  '[&>li:last-child>*>[data-slot=list-item-content]]:after:bg-transparent',
  '[&>li:is(:hover,:has(>:is(:focus-visible,[aria-current])))>*>[data-slot=list-item-content]]:after:bg-transparent',
  // `:has()` can't nest, and `:is()` hides the error, so these stay split.
  '[&>li:has(+li:hover)>*>[data-slot=list-item-content]]:after:bg-transparent',
  '[&>li:has(+li_:focus-visible)>*>[data-slot=list-item-content]]:after:bg-transparent',
  '[&>li:has(+li_[aria-current])>*>[data-slot=list-item-content]]:after:bg-transparent'
].join(' ')

// `not-has-*` hands the card to each group once the root holds one.
export const listVariants = cva(['group/list', listSectionClass], {
  variants: {
    contained: {
      true: [
        'not-has-[>[data-slot=list-group]]:overflow-hidden',
        'not-has-[>[data-slot=list-group]]:rounded-xl',
        'not-has-[>[data-slot=list-group]]:[&_[data-slot=list-item]]:rounded-none',
        'not-has-[>[data-slot=list-group]]:[&_[data-slot=list-item]]:border-0',
        'not-has-[>[data-slot=list-group]]:[&_[data-slot=list-item]]:mx-0',
        'has-[>[data-slot=list-group]]:[&>li>*>[data-slot=list-item-content]]:after:bg-transparent'
      ],
      false: ''
    },
    // Applied via `data-emphasis` on items and group sections.
    emphasis: { subtler: '', subtle: '', normal: '' }
  },
  compoundVariants: [
    {
      contained: true,
      emphasis: 'subtle',
      class: [
        'not-has-[>[data-slot=list-group]]:emphasis-subtle',
        'has-[>[data-slot=list-group]]:[&>li>[data-slot=list-item]]:emphasis-subtle'
      ]
    },
    {
      contained: true,
      emphasis: 'normal',
      class: [
        'not-has-[>[data-slot=list-group]]:emphasis-normal',
        'has-[>[data-slot=list-group]]:[&>li>[data-slot=list-item]]:emphasis-normal'
      ]
    },
    {
      contained: false,
      emphasis: ['subtle', 'normal'],
      class: 'gap-1 [&_[data-slot=list-item-content]]:after:bg-transparent'
    }
  ],
  defaultVariants: { contained: false, emphasis: 'subtler' }
})

// Styled off the root's `data-*` so a group needs no context.
export const listGroupSectionClass = [
  'group-data-[emphasis=subtle]/list:gap-1',
  'group-data-[emphasis=normal]/list:gap-1',
  'group-data-[contained]/list:overflow-hidden',
  'group-data-[contained]/list:rounded-xl',
  'group-data-[contained]/list:[&_[data-slot=list-item]]:rounded-none',
  'group-data-[contained]/list:[&_[data-slot=list-item]]:border-0',
  'group-data-[contained=subtle]/list:emphasis-subtle',
  'group-data-[contained=normal]/list:emphasis-normal'
].join(' ')

// Margin, not a root gap, so loose rows keep their tighter rhythm.
export const listGroupVariants = cva(['grid gap-1.5 mt-6'])

// Matches the rows' bleed so the title aligns with theirs.
export const listGroupTitleVariants = cva([
  'px-3 text-sm font-semibold text-subtler',
  'group-data-[emphasis=subtler]/list:-mx-3'
])

// `selected` skips group emphasis, which is more specific and would win.
export const listItemVariants = cva(
  [
    'is-interactive flex min-h-11 items-stretch rounded-xl px-3 text-left',
    // Only subtler bleeds: nothing paints at rest, so the pill needs room.
    'group-data-[emphasis=subtler]/list:-mx-3'
  ],
  {
    variants: {
      selected: {
        true: 'intent-accent emphasis-subtle',
        false: [
          'emphasis-subtler',
          'group-data-[emphasis=subtle]/list:emphasis-subtle',
          'group-data-[emphasis=normal]/list:emphasis-normal'
        ]
      }
    },
    defaultVariants: { selected: false }
  }
)

// Padding lives here, not on the row, so the divider starts at the title.
export const listItemLeadingClass = 'flex shrink-0 items-center py-3 pr-3'

// A pseudo-element hairline sits in the gap between rows and takes no layout.
export const listItemContentClass = [
  'relative flex min-w-0 flex-1 items-center gap-3 py-3',
  'after:pointer-events-none after:absolute after:inset-x-0 after:h-px',
  'after:-bottom-px after:bg-[var(--intent-border-subtle)]'
].join(' ')

export const listItemBodyClass = 'grid min-w-0 flex-1 gap-0.5'
export const listItemTitleClass =
  'min-w-0 flex-1 truncate font-semibold text-strong'
export const listItemSubtitleClass = 'truncate text-sm text-subtle'

export const listItemTrailingClass = 'flex shrink-0 items-center gap-2'
export const listItemChevronClass = 'size-5 shrink-0 text-subtle'
