import { cva } from 'class-variance-authority'

import { fieldSurfaceClass } from '../../variants'

export type PaneRole = 'list' | 'detail' | 'inspector'
export type PaneEmphasis = 'raised' | 'normal' | 'subtle' | 'subtler'
export type PanePrimaryNav = 'visible' | 'auto' | 'hidden'

// The pane is a ScrollArea root: it owns the surface, the shape and the
// sizing; its viewport owns the scroll. The page itself never scrolls.
//
// Role is three sizing defaults plus a yield order, not a taxonomy:
//   list      capped track
//   detail    takes the remaining space
//   inspector fixed track, and the first to yield when space runs short
//
// Sizing applies from `lg`, the arrangement breakpoint — NOT `md`, which is
// the nav-form breakpoint. Between them the panes are still stacked.
export const paneVariants = cva(
  [
    'relative min-h-0 min-w-0',
    // Published because `overflow-hidden` alone does not contain the chrome:
    // `backdrop-filter` paints outside an ancestor's rounded clip, so a
    // square-cornered header would show its corners past the pane's curve.
    // Header and footer round their own outer edge from this instead.
    '[--pane-radius:var(--radius-2xl)] max-lg:[--pane-radius:0px]',
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
      role: {
        list: 'lg:w-96 lg:shrink-0',
        detail: 'lg:min-w-0 lg:flex-1',
        // Below 2xl the inspector yields its column and is gone. Yielding is
        // still not disappearing — but the affordance that keeps it reachable
        // is a `Drawer` the consumer declares in `Pane.Actions`, not an
        // overlay Roadie invents here. Only an application knows its own
        // breakpoints, and a drawer's dismiss gesture is a JS value.
        inspector: '2xl:w-56 2xl:shrink-0 max-2xl:hidden'
      },
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
        // A pane's `subtler` is no surface at all — not Card's faint tint plus
        // hairline. The recessive pane sits directly on the sunken frame the
        // way the rail does.
        subtler: ''
      },
      // Below `lg` the panes stack and only the top one is visible; from `lg`
      // they are columns and this whole variant is inert. A pane with no
      // stack position — standalone, or an inspector, which never
      // participates — matches none of it: the attribute's absence is the
      // gate, not a JS breakpoint check.
      stackPosition: {
        top: [
          // `!` forces `position: absolute` past the inline `position:
          // relative` Base UI's ScrollArea Root sets on every pane — a class
          // alone loses to an inline style regardless of source order.
          'max-lg:absolute! max-lg:inset-0',
          // The stack position flip is the whole animation: only translate
          // and opacity change, both compositor-friendly, so no JS drives
          // the motion.
          //
          // `translate`, not `transform`: Tailwind v4's translate utilities
          // emit the independent `translate` property, so naming `transform`
          // here transitions nothing and the push/pop would cross-fade
          // without ever sliding.
          //
          // A pane transition is a page transition, not a micro-interaction:
          // the default 150ms it inherited read as a jump cut. `ease-enter`
          // and not `ease-spring` — the spring token peaks at 1.017, and
          // 1.7% of a viewport is a visible bounce at the end of a slide iOS
          // does not have.
          'motion-safe:max-lg:transition-[translate,opacity,visibility]',
          'motion-safe:max-lg:duration-slow motion-safe:max-lg:ease-enter',
          // Not `max-lg:` gated, unlike everything else here: this guard has
          // to hold at every breakpoint, not just the stacked one, so a
          // reduced-motion user is never left relying on some other rule to
          // cancel a transition this component might add above `lg`.
          'motion-reduce:transition-none'
        ].join(' '),
        // Already visited: parked to the left and dimmed.
        behind: [
          'max-lg:absolute! max-lg:inset-0',
          // iOS dims the covered view with a scrim rather than fading it
          // out. 0.9 over the sunken frame lands in the same place without a
          // second painted layer; 0.6 ghosted the frame straight through the
          // pane.
          'max-lg:-translate-x-1/3 max-lg:opacity-90',
          'max-lg:pointer-events-none',
          // Not the `inert` attribute: that can't be gated to the stacked
          // band, and above `lg` this pane is a live column. Hidden drops it
          // from the AT tree and tab order; transitioning `visibility` flips
          // it after the slide out and before the slide in, while the top
          // pane covers it.
          'max-lg:invisible',
          // A covered pane is not visible, so let the browser skip its
          // layout and paint entirely. Measured as a no-op at -22% — a pane
          // that far over was still ~78% on screen, so the browser kept its
          // subtree relevant. A behind-pane at -1/3 still does not engage
          // this; it only started paying off once ahead-panes parked fully
          // off-screen.
          'max-lg:[content-visibility:auto]',
          'motion-safe:max-lg:transition-[translate,opacity,visibility]',
          'motion-safe:max-lg:duration-slow motion-safe:max-lg:ease-enter',
          'motion-reduce:transition-none'
        ].join(' '),
        // Not yet reached: parked fully off-screen right. Explicit now,
        // rather than derived from a sibling combinator reading DOM order —
        // that is the point of the pane carrying its own position.
        ahead: [
          'max-lg:absolute! max-lg:inset-0',
          'max-lg:translate-x-full max-lg:opacity-100',
          'max-lg:pointer-events-none max-lg:invisible',
          'max-lg:[content-visibility:auto]',
          'motion-safe:max-lg:transition-[translate,opacity,visibility]',
          'motion-safe:max-lg:duration-slow motion-safe:max-lg:ease-enter',
          'motion-reduce:transition-none'
        ].join(' ')
      }
    },
    defaultVariants: { role: 'list', emphasis: 'raised' }
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
// The docked shadow. `box-shadow` is a paint property, not a layout one, so
// transitioning it is allowed where the header's own `height` is not — the
// same reason the tab bar already transitions its own. The header never sizes
// itself through the collapse; the title's row is what closes, and pays for
// its layout transition with the reasoning recorded there.
export const paneHeaderVariants = cva(
  [
    'sticky top-0 z-sticky grid grid-cols-[auto_minmax(0,1fr)_auto]',
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
    // against the header's lower boundary — the Navigator strip — can cancel it
    // by reading the same value instead of restating the number.
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
    'motion-safe:transition-[box-shadow] motion-safe:duration-slow motion-safe:ease-enter',
    'motion-reduce:transition-none'
  ],
  {
    variants: {
      // A header whose only content is the back/close cell has nothing left
      // to draw once that cell's occupant does, so it goes with it rather
      // than leaving an empty sticky bar at the top of the pane. `'back'` and
      // `'close'` are each `lg:hidden`/`max-lg:hidden` on their own, so the
      // header only needs to echo whichever one is present alone; when both
      // are (a non-root pane with `onClose`), one or the other always draws,
      // so the header stays put at every width.
      edgeOnly: { back: 'lg:hidden', close: 'max-lg:hidden', none: '' },
      collapsed: { true: 'shadow-md', false: 'shadow-none' }
    },
    defaultVariants: { edgeOnly: 'none', collapsed: false }
  }
)

// The back/close cell, leading end of the header's top row. Back and Close
// are the same slot at different sizes — `lg` is the arrangement breakpoint,
// so below it panes cover each other and Back pops the stack; from it panes
// are columns with nothing covering them, and Close dismisses one instead.
// The two gates are mutually exclusive, so neither can ever collide with the
// other or with the compact title's centre column. Expressed here rather
// than in `PaneHeader` because which band the panes stack in is a stylesheet
// fact; the component must not know it.
const paneHeaderEdgeCellClasses = 'col-start-1 row-start-1 justify-self-start'

export const paneHeaderBackVariants = cva([
  `${paneHeaderEdgeCellClasses} lg:hidden`
])

export const paneHeaderCloseVariants = cva([
  `${paneHeaderEdgeCellClasses} max-lg:hidden`
])

// The large title. It leaves on `scale` and `opacity`, and the row it sits in
// closes underneath it.
//
// **`grid-template-rows` and `margin-top` are layout properties, and
// transitioning them here is deliberate.** Nothing else can reclaim the row's
// space: transforms move pixels without releasing layout, so `scale` alone
// left the header at full height until `display: none` dropped it in a single
// frame — the snap this replaces, measured at 46px on four different header
// heights. The cost is the one the mobile tab bar's `padding` carried: they
// run once per collapse toggle, not once per scroll frame, and over one small
// subtree. Do not "optimise" this back to a discrete `display` change.
//
// `1fr → 0fr` rather than a measured height, so it holds for any heading size
// and any header contents with nothing to observe: against an auto-height
// container an `fr` row resolves to its content, so the expanded state is the
// title's own height whatever that is. The row only reaches zero if the item
// in it may be smaller than its content, which is what `paneTitleClipClass`
// is for — an anonymous grid item cannot be told to clip, so the title's
// children need a real element around them.
//
// The margin is the row gap above the title, which the header hands to its
// rows rather than declaring as `row-gap` precisely so this one can close with
// the row instead of outliving it as an 8px ledge. It cannot be folded into
// the row as padding on the clipped item either: padding is never clipped, so
// it would survive the collapse as the same ledge one element further in.
//
// Not `surfaceTitleClass`: that's shared with `Dialog.Title` and
// `Drawer.Title`, which head compact overlay surfaces where `ui-4` is
// correctly sized. A pane title heads a full column or page, so it takes its
// own, larger token instead of bumping the shared one for all three.
//
// Collapsed, this stays in the accessibility tree — `overflow-hidden` on
// `paneTitleClipClass` plus a zeroed row clips it visually, but an `<h2>` at
// zero pixels is still announced and reachable by heading navigation. That's
// the opposite choice from the compact echo below, which uses `invisible` to
// leave the tree entirely — deliberately: `visibility` here would kill the
// `opacity` fade this collapse depends on, so the title has to stay visible
// (in the accessibility sense) through it. One consequence either title
// carries: interactive content a consumer nests inside it is
// keyboard-focusable while clipped and invisible.
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
