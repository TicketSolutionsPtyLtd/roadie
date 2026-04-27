import { cva } from 'class-variance-authority'

// `data-[orientation=vertical]:flex-col` lets Base UI's vertical mode
// reflow the list without us re-implementing the same toggle on every
// child.
//
// Emphasis ladder (single source of truth for descriptions; mirrored
// in TabsRoot.tsx prop JSDoc):
// - strong  — segmented control with a solid inverted pill (used for
//             high-contrast contexts). Same list shape as `normal`.
// - normal  — full segmented control: tinted track + raised pill.
// - subtle  — ghost segmented: no track background, just the
//             tinted pill behind the active tab.
// - subtler — underline: flat row with a sliding bottom bar
//             (left-edge bar in vertical mode).
//
// `strong` and `normal` are intentionally byte-identical at the list
// level — the visual distinction lives in the indicator and active
// tab text colour. Keep them aliased rather than collapsed so a
// future tweak to one doesn't accidentally silently change both.
//
// `subtler` is the only emphasis whose track follows the indicator
// onto a different axis: in vertical mode the bottom border becomes
// a left-edge border so the static track aligns with the sliding
// bar. The other emphases use a full-rect indicator that needs no
// axis swap on the list.
//
// Note: the `data-orientation` attribute used by these variants is
// emitted natively by Base UI Tabs (driven by the wrapper's
// `direction` prop, which translates to Base UI's `orientation`).
export const tabsListVariants = cva(
  'relative inline-flex items-center data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
  {
    variants: {
      emphasis: {
        strong: 'gap-1 rounded-full p-1 emphasis-subtle',
        normal: 'gap-1 rounded-full p-1 emphasis-subtle',
        subtle: 'gap-1 rounded-full p-1',
        subtler:
          'gap-1 border-b border-subtle data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-l data-[orientation=vertical]:border-l-subtle'
      }
    },
    defaultVariants: { emphasis: 'normal' }
  }
)

// `relative z-[1]` keeps the tab text and any focus ring above the
// indicator pill that sits behind it. The active text colour shifts
// per emphasis: `text-strong` for raised/tinted/underline pills,
// `text-inverted` for the dark `emphasis-strong` pill so the label
// reads against the inverted surface. `is-interactive` wires the
// focus ring, cursor, color transition, and disabled state. In
// vertical direction the tabs left-align their content so labels
// don't float in the middle of the column.
export const tabsTabVariants = cva(
  [
    'is-interactive relative z-[1]',
    'inline-flex items-center gap-1.5',
    'justify-center data-[orientation=vertical]:justify-start',
    'font-semibold whitespace-nowrap',
    'text-subtle hover:text-normal'
  ].join(' '),
  {
    variants: {
      emphasis: {
        strong: 'rounded-full data-[active]:text-inverted',
        normal: 'rounded-full data-[active]:text-strong',
        subtle: 'rounded-full data-[active]:text-strong',
        subtler: 'rounded-none data-[active]:text-strong'
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-base'
      }
    },
    defaultVariants: { emphasis: 'normal', size: 'md' }
  }
)

// Geometry comes from Base UI's `--active-tab-*` CSS variables on the
// indicator element itself (Base UI v1.3 ships them as
// --active-tab-left/top/width/height; verified against
// node_modules/.../tabs/indicator/TabsIndicatorCssVars.js).
//
// `transition-all` on the indicator's own left/top/width/height is
// what produces the sliding-pill animation across every emphasis.
// Duration and easing use Roadie's motion tokens (`duration-slow` =
// 300ms, `ease-enter` ≈ "ease out") declared as `@utility` blocks
// in `packages/core/src/css/motion.css`.
//
// The global `prefers-reduced-motion` reset in `motion.css` clamps
// transition-duration to 0.01ms, so no per-element `motion-reduce:`
// override is needed.
//
// In vertical orientation the underline variants swap from a
// bottom-edge bar to a left-edge bar by re-mapping the same vars.
export const tabsIndicatorVariants = cva(
  [
    'pointer-events-none absolute z-0',
    'transition-all duration-slow ease-enter'
  ].join(' '),
  {
    variants: {
      emphasis: {
        strong: [
          'left-[var(--active-tab-left)] top-[var(--active-tab-top)]',
          'h-[var(--active-tab-height)] w-[var(--active-tab-width)]',
          'rounded-full emphasis-strong'
        ].join(' '),
        normal: [
          'left-[var(--active-tab-left)] top-[var(--active-tab-top)]',
          'h-[var(--active-tab-height)] w-[var(--active-tab-width)]',
          'rounded-full emphasis-raised'
        ].join(' '),
        subtle: [
          'left-[var(--active-tab-left)] top-[var(--active-tab-top)]',
          'h-[var(--active-tab-height)] w-[var(--active-tab-width)]',
          'rounded-full emphasis-subtle'
        ].join(' '),
        subtler: [
          'bottom-0 left-[var(--active-tab-left)] h-[2px] w-[var(--active-tab-width)]',
          'bg-[var(--intent-bg-strong)]',
          'data-[orientation=vertical]:left-0 data-[orientation=vertical]:bottom-auto',
          'data-[orientation=vertical]:top-[var(--active-tab-top)] data-[orientation=vertical]:h-[var(--active-tab-height)] data-[orientation=vertical]:w-[2px]'
        ].join(' ')
      }
    },
    defaultVariants: { emphasis: 'normal' }
  }
)

// Inline literal unions (rather than `VariantProps<typeof v>['key']`)
// so `react-docgen-typescript` — which can't drill into CVA's
// conditional types — surfaces the choices in
// <PropsDefinitions>. See
// docs/solutions/build-errors/react-docgen-cva-literal-props.md.
export type TabsRootIntent =
  | 'neutral'
  | 'brand'
  | 'brand-secondary'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
export type TabsRootEmphasis = 'strong' | 'normal' | 'subtle' | 'subtler'
export type TabsRootSize = 'sm' | 'md' | 'lg'
export type TabsRootDirection = 'horizontal' | 'vertical'
