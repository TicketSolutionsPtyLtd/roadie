import { cva } from 'class-variance-authority'

import { fieldSurfaceClass } from '../../variants'

export type PaneRole = 'list' | 'detail' | 'inspector'
export type PaneEmphasis = 'raised' | 'normal' | 'subtle' | 'subtler'
export type PanePrimaryNav = 'visible' | 'auto' | 'hidden'

// The pane is a ScrollArea root: it owns the surface and the shape; its
// viewport owns the scroll. The page itself never scrolls.
export const paneVariants = cva(
  [
    'relative min-h-0 min-w-0',
    // Published because `overflow-hidden` alone does not contain the chrome:
    // `backdrop-filter` paints outside an ancestor's rounded clip, so a
    // square-cornered header would show its corners past the pane's curve.
    // Header and footer round their own outer edge from this instead.
    '[--pane-radius:var(--radius-2xl)] max-md:[--pane-radius:0px]',
    'overflow-hidden rounded-(--pane-radius)',
    // How far the pane's own content sits from its edge. Published rather
    // than applied because the pane cannot pad itself — its chrome is sticky
    // and its body scrolls — so header, footer and body each apply it. It
    // also cascades, which is what lets a `List` dropped straight into a pane
    // land its row text on the same edge as the header title with nothing
    // declared at the call site. A container that owns a different inset
    // (a `Card`, say) republishes it for its own subtree.
    '[--content-inset:--spacing(6)]'
  ],
  {
    variants: {
      // `--pane-surface` is the nearest *opaque* token behind the pane's
      // sticky chrome. Sticky chrome can't use `bg-inherit` — the ScrollArea
      // viewport and content between it and this element declare no
      // background, so `inherit` resolves to `transparent` and body content
      // scrolls straight through the header.
      //
      // Only the emphases that actually paint a surface name one. The two
      // alpha-tinted ones paint nothing opaque, so they set nothing and
      // inherit whatever they are genuinely sitting on — sunken inside
      // `Navigator.Content`, the page's own surface standalone. The pane's
      // tint still paints behind the translucent bar either way.
      emphasis: {
        raised: 'emphasis-raised [--pane-surface:var(--intent-bg-raised)]',
        normal: 'emphasis-normal [--pane-surface:var(--intent-bg-normal)]',
        subtle: 'emphasis-subtle',
        // No surface at all: the pane sits directly on the sunken frame.
        subtler: ''
      }
    },
    defaultVariants: { emphasis: 'raised' }
  }
)

export const paneViewportVariants = cva(['size-full overscroll-contain'], {
  variants: {
    // Clears the floating tab bar. Dropped when this pane hides the bar,
    // otherwise it leaves an empty strip at the foot of the pane.
    clearsPrimaryNav: { true: 'max-md:pb-24', false: '' }
  },
  defaultVariants: { clearsPrimaryNav: true }
})

// Translucent rather than flat: the pane's chrome is a material the body
// scrolls beneath, diffused by the blur instead of hidden by a slab. Mixed
// against `--pane-surface` so it reads as the pane's own surface at every
// emphasis, including the surfaceless `subtler`. The fallback is what a
// surfaceless pane on an un-annotated page sits on; `Navigator.Content`
// overrides it to sunken for the panes inside its frame.
const PANE_CHROME_SURFACE =
  'bg-[color-mix(in_oklab,var(--pane-surface,var(--intent-bg-normal))_80%,transparent)] backdrop-blur-md'

// Three real columns, not one shared cell distinguished by `justify-self`: a
// grid cell doesn't stop siblings inside it from overlapping, since each is
// still sized independently. Back and Close share column 1 — the same slot at
// different sizes, gated so at most one ever draws — the compact title column
// 2 (`minmax(0,1fr)` so it takes the remainder and can actually shrink to 0
// for `truncate` to engage), actions column 3 — each neighbour claims only
// the width its own content needs, so nothing can grow into another's space.
// `auto` columns collapse to zero when empty, so a header with neither
// neighbour still gives the title the full row.
// The docked shadow is a pseudo-element's opacity, so it fades on the
// compositor instead of repainting under the blur; the title's row does the
// resizing.
export const paneHeaderVariants = cva(
  [
    'sticky top-0 z-sticky grid-cols-[auto_minmax(0,1fr)_auto]',
    '[container:pane-header/inline-size]',
    // Published for the same reason as the bottom padding below: the stacked
    // rows apply it themselves, and a restated `2` would drift from this one
    // the first time either moved.
    '[--pane-header-gap:--spacing(2)]',
    // Columns only. The vertical rhythm is each stacked row's own top margin,
    // below, because `row-gap` belongs to the grid and the title has to take
    // the space above it *with* it when its row closes on collapse. A closed
    // row cannot claw a shared `row-gap` back: a track's size floors at zero,
    // so a negative margin on a zero-height item is simply discarded
    // (measured — the collapsed header sat 8px taller at every margin from
    // -4px to -24px).
    'gap-x-(--pane-header-gap)',
    PANE_CHROME_SURFACE,
    // Published rather than applied literally so content that has to sit flush
    // against the header's lower boundary can cancel it by reading the same
    // value instead of restating the number.
    '[--pane-header-pad-b:--spacing(2)]',
    '-mx-(--content-inset) px-(--content-inset) pt-4 pb-(--pane-header-pad-b)',
    'rounded-t-(--pane-radius)',
    // One default control (`--spacing(10)`, a `btn-md`/`btn-icon-md`) plus the
    // header's own vertical padding — `pt-4` and `--pane-header-pad-b` above,
    // restated in the same terms rather than the 64px they currently sum to,
    // so this tracks either token if it moves. A static clamp: the collapse
    // still runs over the title's own row, this only stops the header
    // shrinking past control-sized chrome once that row bottoms out.
    'min-h-[calc(--spacing(4)_+_--spacing(10)_+_var(--pane-header-pad-b))]',
    // The title, `Pane.Search` and anything else a consumer drops in are body
    // content, not top-row occupants — none of them claim a column of their
    // own, so without this they'd only fill column 1 under the new template.
    // Spanning all three puts them back to full width, auto-placed into
    // whichever row the top row's three explicit occupants leave free.
    '[&>*:not([data-slot=pane-back]):not([data-slot=pane-close]):not([data-slot=pane-title-compact]):not([data-slot=pane-actions])]:col-span-3',
    // The row gap, as the rows' own margin. `Pane.Title` is excluded because
    // it animates this margin to zero as it collapses, and a rule here would
    // out-specify its own class. This selector's specificity (0,5,0) also
    // out-specifies any other header child's own `mt-*` utility (0,1,0) —
    // the plain `row-gap` this rule replaced never did, since gap isn't a
    // per-child property a consumer can override with a class.
    '[&>*:not([data-slot=pane-back]):not([data-slot=pane-close]):not([data-slot=pane-title-compact]):not([data-slot=pane-actions]):not([data-slot=pane-title])]:mt-(--pane-header-gap)',
    "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-md after:content-['']",
    'motion-safe:after:transition-opacity motion-safe:after:duration-slow motion-safe:after:ease-enter',
    'motion-reduce:after:transition-none'
  ],
  {
    variants: {
      // The leading cell's occupant decides whether an otherwise-empty header draws.
      edgeOnly: {
        none: 'grid',
        back: '[display:var(--pane-back)]',
        close: '[display:var(--pane-close)]',
        both: '[display:var(--pane-edge)]'
      },
      collapsed: { true: 'after:opacity-100', false: 'after:opacity-0' }
    },
    defaultVariants: { edgeOnly: 'none', collapsed: false }
  }
)

// Back and Close share the leading cell; the stylesheet draws at most one.
const paneHeaderEdgeCellClasses = 'col-start-1 row-start-1 justify-self-start'

export const paneHeaderBackVariants = cva([paneHeaderEdgeCellClasses])

export const paneHeaderCloseVariants = cva([paneHeaderEdgeCellClasses])

// A container query reads the content box: a 24rem header less its 1.5rem insets.
export const paneBackLabelClass =
  'hidden max-w-[12ch] truncate @min-[21rem]/pane-header:inline'

export const paneBackLabelledClass = '@max-[21rem]/pane-header:btn-icon-md'

// The large title fades and scales while its row closes underneath.
// Transitioning `grid-template-rows` and `margin-top` is deliberate: transforms
// don't release layout, so the header would snap by the title's height. It
// runs once per toggle, not per scroll frame. `1fr → 0fr` fits any title with
// nothing to measure, and the margin is the row gap, so it closes with the row.
// A pane title heads a column, so it takes a larger token than
// `surfaceTitleClass`. Collapsed, it stays in the accessibility tree:
// `visibility` would kill the fade.
export const paneTitleVariants = cva(
  ['text-display-ui-3 text-strong', 'origin-left'],
  {
    variants: {
      // Only inside a `Pane` is there a collapse to play or a compact echo
      // holding the row above this one. Standalone, the title is just a
      // heading — and `--pane-header-gap` is unpublished there, so the row
      // margin below resolves to nothing on its own.
      collapsible: {
        true: [
          'grid',
          'motion-safe:transition-[grid-template-rows,margin-top,scale,opacity]',
          'motion-safe:duration-slow motion-safe:ease-enter',
          'motion-reduce:transition-none'
        ].join(' '),
        false: ''
      },
      collapsed: {
        true: 'grid-rows-[0fr] mt-0 scale-95 opacity-0',
        false: 'grid-rows-[1fr] mt-(--pane-header-gap) scale-100 opacity-100'
      }
    },
    defaultVariants: { collapsible: false, collapsed: false }
  }
)

// Wraps a collapsible title's children so the row has an item that can clip.
// A grid item's automatic minimum size is its content unless it clips, and a
// row cannot shrink below the item in it — so without this the track holds at
// full height and nothing collapses.
export const paneTitleClipClass = 'overflow-hidden'

// The content-placed large title. No collapse variant and no transition: it
// scrolls out of view on the pane's own scroll, which is the point — the
// header's echo is what fades. Nothing about the header's box depends on it,
// so the collapse has nothing left to snap.
//
// Deliberately no inset of its own, unlike `Pane.Header` and `List`: what the
// title has to align with is the *content* beside it, and a container can
// republish `--content-inset` for its own subtree. Self-insetting would land
// the title on the pane's edge instead of its neighbours'. The caller places
// it.
export const paneBodyTitleVariants = cva(['text-display-ui-3 text-strong'])

// The compact echo: its own middle column, filling it and centring its text —
// which, since that column is exactly the row's remaining width, reads as
// centred between the back affordance and `Pane.Actions` without measuring
// either. Not `justify-self-center`: a `minmax(0,1fr)` track's `1fr` maximum
// is treated as `auto` when the grid resolves intrinsic track sizes, so a
// non-stretched item's own max-content width feeds back into how wide the
// track grows — the track would size to fit the *untruncated* title instead
// of bounding it. Stretching the item to the track's resolved size, then
// centring the text inside that fixed box, breaks the feedback loop.
export const paneTitleCompactVariants = cva(
  [
    'col-start-2 row-start-1 w-full',
    // A flex row so the up-icon can sit beside the text, but the trap this
    // guards against doesn't care how the box lays out its children — only
    // that the box itself is stretched (`w-full`), can shrink below its
    // content (`min-w-0`) and clips rather than growing the track
    // (`truncate`). All three still apply to this element even though the
    // text truncation itself now happens on the inner span.
    'inline-flex items-center justify-center gap-1',
    'min-w-0 truncate cursor-pointer text-sm font-semibold text-strong',
    'motion-safe:transition-[scale,opacity] motion-safe:duration-slow',
    'motion-safe:ease-enter motion-reduce:transition-none'
  ],
  {
    variants: {
      collapsed: {
        true: 'scale-100 opacity-100',
        // Not `hidden`: it keeps its cell so the row's centre never reflows
        // as it appears. `invisible` is what takes it out of the AT tree.
        false: 'invisible scale-95 opacity-0'
      }
    },
    defaultVariants: { collapsed: false }
  }
)

// Claims column 3 of the top row rather than being collected into a row
// element, so no walk over the header's children is needed and the row simply
// doesn't exist when nothing occupies it. Placement only works on a direct
// child of `Pane.Header`.
export const paneActionsVariants = cva([
  'col-start-3 row-start-1 flex flex-wrap items-center justify-end gap-1',
  'justify-self-end'
])

export const paneSearchVariants = cva([
  fieldSurfaceClass,
  'h-9 w-full rounded-lg px-3',
  'text-sm placeholder:text-subtler'
])

export const paneFooterVariants = cva([
  'sticky bottom-0 z-sticky',
  PANE_CHROME_SURFACE,
  'rounded-b-(--pane-radius)',
  '-mx-(--content-inset) px-(--content-inset) pt-2 pb-4'
])
