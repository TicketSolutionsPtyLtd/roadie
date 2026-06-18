---
'@oztix/roadie-widgets': major
---

**Breaking (Vue skin):** the cart drawer's Vue skin now emits raw
Roadie/Tailwind utility classes — the same ones the React skin uses — instead
of shipping a self-contained, hand-authored `rc-` stylesheet. This makes
core, React, and Vue share a single styling source of truth.

The host **must** now provide the styles, exactly as every React Roadie
consumer already does:

1. Run **Tailwind CSS v4** in the host build.
2. In the host's global CSS:

   ```css
   @import '@oztix/roadie-core/css';
   @source '../node_modules/@oztix/roadie-widgets/dist/cart-drawer/vue';
   ```

3. Import the widget's bespoke keyframes (replaces the old `style.css`):

   ```js
   import '@oztix/roadie-widgets/cart-drawer/vue/motion.css'
   ```

A host that loads neither Tailwind nor Roadie core CSS renders the drawer
**unstyled**. Hosts that cannot run Tailwind v4 are not supported by `3.0.0`
and should stay on `2.x`.

**Migration:**

- Remove `import '@oztix/roadie-widgets/cart-drawer/vue/style.css'` — the
  `./cart-drawer/vue/style.css` export has been **removed** and replaced by
  `./cart-drawer/vue/motion.css` (bespoke `cart-bounce` / `badge-pop` /
  `cart-pop-in` keyframes only).
- Add the Tailwind v4 + `@oztix/roadie-core/css` import + `@source` scan shown
  above.
- The Vue skin now renders icons via `@phosphor-icons/vue`, added as a new
  **optional peer dependency** (`^2.2.0`). Install it in the host.

The overlay blur changes from a hand-rolled `blur(2px)` to Roadie's
`emphasis-overlay` (`blur(8px)`), and button heights align to Roadie's
`btn-md` / `btn-sm` tiers to match what the React skin renders.
