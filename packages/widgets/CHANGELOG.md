# @oztix/roadie-widgets

## 0.1.0

### Minor Changes

- b0d8b40: Initial release. `@oztix/roadie-widgets` debuts with a shared cart drawer
  extracted from the Oztix website into a framework-agnostic package:
  - `cart-drawer/core` — BYOF transport client, drag math, urgency state
    machine, currency/date formatting, URL validation.
  - `cart-drawer/react` — React 19 skin.
  - `cart-drawer/vue` — Vue 3 SFC skin plus compiled stylesheet at
    `cart-drawer/vue/style.css` for Webpack/SCSS consumers without Tailwind.

  API is pre-1.0; expect breaking changes.
