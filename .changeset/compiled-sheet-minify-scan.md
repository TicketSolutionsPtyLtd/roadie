---
'@oztix/roadie-core': patch
---

Remove 83 classes from `@oztix/roadie-core/css/compiled` that `safelist.html` never named, and minify the sheet. Its build scanned the whole package by mistake, so it picked up classes named in the package's source, tests, changelog, and README. Every class `safelist.html` names stays, and an app that imports `@oztix/roadie-core/css` and runs Tailwind is unchanged.

A host that links the compiled sheet and writes one of these classes loses its styles, and should write that rule in its own CSS:

- Layout and sizing: `absolute`, `fixed`, `relative`, `static`, `block`, `inline`, `flex`, `grid`, `hidden`, `contents`, `table`, `collapse`, `visible`, `grow`, `shrink`, `shrink-0`, `items-baseline`, `items-center`, `items-end`, `self-stretch`, `justify-self-stretch`, `place-self-stretch`, `gap-2`, `p-1`, `p-4`, `p-6`, `w-auto`, `w-fit`, `w-full`, `min-w-0`, `max-w-sm`, `max-w-xl`, and `container-sm`.
- Text: `text-xs`, `text-sm`, `text-lg`, `italic`, `underline`, `uppercase`, `lowercase`, and `truncate`.
- Borders and effects: `border`, `outline`, `ring`, `shadow`, `rounded`, `rounded-sm`, `rounded-xl`, `rounded-4xl`, `rounded-5xl`, `rounded-full`, `blur`, `filter`, `backdrop-filter`, and `bg-(--intent-bg-raised)`.
- Motion: `transition`, `transition-[…]`, `animate-none`, `animate-pulse`, `animate-spin`, `duration-150`, `duration-300`, `ease-in`, `ease-out`, `ease-linear`, `ease-enter`, `ease-exit`, `ease-standard`, `ease-spring`, and `ease-spring-lively`.
- Layers: `z-40`, `z-80`, `z-hide`, `z-base`, `z-docked`, `z-sticky`, `z-overlay`, `z-modal`, `z-popover`, `z-toast`, `z-tooltip`, and `z-alert`.
- `navigator-expanded:grid`.

27 theme variables that only those classes or the package's own source kept in the sheet leave with them: `--z-index-*` (ten layers), `--radius-sm`, `--radius-4xl` to `--radius-7xl`, `--container-sm`, `--container-xl`, `--breakpoint-md`, `--ease-in`, `--ease-out`, `--animate-spin`, `--animate-pulse`, `--default-transition-duration`, `--default-transition-timing-function`, `--background-color-mark`, `--stagger-base`, and `--transition-duration-slow`. The `spin` and `pulse` keyframes go too, with Tailwind's internal `--tw-*` variables for those classes.

The sheet is now minified with its nesting flattened, so it no longer needs a browser that supports CSS nesting. It is 16% smaller (164.7 kB, 17.3 kB with brotli). In Safari, `btn` text can no longer be selected, as in other browsers, because the minifier adds the `-webkit-user-select` prefix.
