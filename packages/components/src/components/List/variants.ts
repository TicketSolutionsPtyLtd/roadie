import { cva } from 'class-variance-authority'

// A run of rows is a *section*: the root's own `<ul>` when items are declared
// loose, and each `List.Group`'s inner `<ul>` when they're grouped. These are
// the rules every section shares, whichever it is.
//
// No gap: rows sit flush and the separator is the only thing between them, so
// its spacing is symmetric by construction — the row's own padding above it and
// below it, and nothing else.
//
// Dividers turn transparent here — a section-level concern, so each item can
// carry its own divider unaware of its position. The last row's always goes,
// and so do the two that touch a row wearing a fill: its own, and the one
// belonging to the row above. A hairline running through a rounded fill reads
// as a mistake, and the fill is what separates that row anyway.
//
// "Wearing a fill" is `:hover` and `:focus-visible` — the exact pair the
// emphasis utilities tint on, not `:focus-within`, which a mouse click leaves
// behind and would strand the hairlines hidden with no fill to explain it.
// Every one of these is a selector, never a prop: a hover or a selection never
// re-renders a row, however long the list is.
//
// The selectors walk `li > [data-slot=list-item] > [data-slot=list-item-content]`
// by child combinator rather than descending freely, so a `List.Group` sitting
// among loose rows can't be mistaken for one of them and take its whole
// section's hairlines with it.
export const listSectionClass = [
  // `[&>li]:grid` so a row stretches to the section's width: a row is a
  // button, and buttons shrink-wrap even as a block-level flex container.
  // A width on the row itself would over-constrain it and its negative
  // margin would shift the box instead of widening it on both sides.
  'grid [&>li]:grid',
  '[&>li:last-child>*>[data-slot=list-item-content]]:after:bg-transparent',
  '[&>li:is(:hover,:has(>:is(:focus-visible,[aria-current])))>*>[data-slot=list-item-content]]:after:bg-transparent',
  // The row above a filled one, matched by descendant rather than a nested
  // `:has()` — that is invalid CSS, and `:is()` swallowed the error silently,
  // so the pair spelt that way parsed but never matched.
  '[&>li:has(+li:hover)>*>[data-slot=list-item-content]]:after:bg-transparent',
  '[&>li:has(+li_:focus-visible)>*>[data-slot=list-item-content]]:after:bg-transparent',
  '[&>li:has(+li_[aria-current])>*>[data-slot=list-item-content]]:after:bg-transparent'
].join(' ')

// `emphasis` names a surface; `contained` decides which element wears it.
//
// Uncontained (the default) the surface is the row: each item is its own
// `rounded-xl` emphasis pill and the list is bare. The emphasis lands on the
// item rather than here, via `data-emphasis` and the `group-data-*` selectors
// in `listItemVariants` — the utility has to sit on the same element as
// `is-interactive` for its hover/press rules to match, and `ListItem` stays
// server-safe, so a data attribute does the work a context would.
//
// Contained, the surface is the section: a card, `overflow-hidden` so the flush
// square rows are clipped by it, and rows fall back to their transparent base
// so the card shows through. With groups that means one card per group, so the
// root — which is only a section when its rows are loose — hands the card over
// the moment it holds a `List.Group`. Hence `not-has-*` on every card class
// here rather than a walk: `List` never has to look at its children.
//
// A filled emphasis needs no hairlines at all — the rows are visible surfaces,
// so they're gapped instead and every divider hides. That one is a plain
// descendant selector, so it reaches grouped rows too.
//
// A loose row in a contained list that also holds groups has no section card of
// its own to sit in, so it becomes its own one-row card — `>li>[data-slot=
// list-item]` reaches only loose rows, since a group's `<li>` holds a title and
// a `<ul>` rather than a row.

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
    // Consumed on the item, or on a group's section — see `listItemVariants`
    // and `listGroupSectionClass`.
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

// A group's own section. Everything the root resolves from its props, this has
// to read off the root's `data-*` instead — a group is styled entirely from
// above, so `List.Group` needs to know nothing about the list it's in.
//
// `data-emphasis` and `data-contained` are mutually exclusive by construction
// (see `ListRoot`), which is what keeps the gap rules from fighting.
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

// The group itself — a titled section, so an `<li>` holding the title and its
// own `<ul>`. Groups need more air between them than rows do; the top margin
// (not a gap on the root) keeps loose rows on their own tighter rhythm when the
// two are mixed.
// Every group gets air above it, the first included — `not-first` left the
// leading title hard against whatever precedes the list, usually a header.
export const listGroupVariants = cva(['grid gap-1.5 mt-6'])

// The quiet label above a group. Wears the rows' own bleed so the title starts
// in the same column as their titles — including when the group is a card,
// which the title sits above rather than inside.
export const listGroupTitleVariants = cva([
  'px-3 text-sm font-semibold text-subtler',
  'group-data-[emphasis=subtler]/list:-mx-3'
])

// One row. The surface comes from the emphasis shortcuts rather than
// hand-rolled hover colours, so a row can't drift from the rest of the system:
// `emphasis-subtler` reads as transparent alongside `is-interactive` and brings
// its own hover and press tints. A grouped list sets no `data-emphasis`, so its
// rows stay on that transparent base and the card behind them shows through.
//
// `selected` is an accent-tinted fill — hue sets it apart where lightness alone
// wouldn't — and deliberately skips the group-driven emphasis so it can't be
// overridden back to transparent by the higher-specificity `group-data-*` rule.
export const listItemVariants = cva(
  [
    'is-interactive flex min-h-11 items-stretch rounded-xl px-3 text-left',
    // Only subtler pulls, and only sideways — the same reason a subtler `Card`
    // carries `-m-2`: nothing is painted at rest, so the hover pill needs room
    // without the text moving to make it. A visible surface (subtle, normal,
    // contained) keeps its box and indents its own content instead.
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

// Leading tile column. `pr-3` is the gap to the content — kept on the leading
// element (not the flex parent) so the inset divider starts exactly where the
// title begins.
// The row's vertical padding lives on each of its children, not the row, so
// the divider can derive its position from the content's own edge. The
// leading column needs its own or a tile sits hard against the row's edges
// while the text beside it is padded.
export const listItemLeadingClass = 'flex shrink-0 items-center py-3 pr-3'

// Title + trailing region. Carries the inset hairline, which starts at this
// element's left edge — after the leading column when present, at the row edge
// when not — giving the iOS separator that begins at the title.
//
// The hairline is a pseudo-element rather than a `border-b` so it can sit in
// the 2px the rows' own emphasis borders leave between them — `-bottom-px`
// rather than at the row's edge, which would put that whole space below the
// line and none above it. It takes no layout either way, so turning it
// transparent can't shift the rows below.
//
// One padding for every row. Media doesn't earn extra: a tile is 40px and a
// title+subtitle body is taller than that, so a bump keyed on "has leading"
// only ever inflated the rows that were already the tallest. `min-h-11` is what
// actually keeps a bare title row from collapsing under the touch target.
export const listItemContentClass = [
  'relative flex min-w-0 flex-1 items-center gap-3 py-3',
  'after:pointer-events-none after:absolute after:inset-x-0 after:h-px',
  'after:-bottom-px after:bg-[var(--intent-border-subtle)]'
].join(' ')

export const listItemBodyClass = 'grid min-w-0 flex-1 gap-0.5'
export const listItemTitleClass =
  'min-w-0 flex-1 truncate font-semibold text-strong'
export const listItemSubtitleClass = 'truncate text-sm text-subtle'

// Trailing sits to the left of the chevron; both right-aligned with a small
// gap — the iOS "value › chevron" pattern.
export const listItemTrailingClass = 'flex shrink-0 items-center gap-2'
export const listItemChevronClass = 'size-5 shrink-0 text-subtle'
