---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
---

Add color mode utilities and improve design tokens

**New Features:**

- Add vanilla JavaScript `colorMode` utilities for framework-agnostic color mode management
- Export `useColorMode` hook separately from components for better tree-shaking
- Add CSS custom properties and utilities for color mode tokens

**Token Improvements:**

- Align brand color names with lighting metaphor system (luminary, beacon, radiance, brilliance, spark)
- Normalize all hex color codes to lowercase for consistency
- Adjust semantic token `surface.strong` mappings for better contrast
- Fix `Heading` component default `colorPalette` to use `neutral`

**Developer Experience:**

- Improve generated CSS token formatting to match Prettier rules
- Optimize PandaCSS codegen to eliminate duplicate type generation
- Add TypeScript incremental compilation support for faster builds

**Documentation:**

- Update docs to demonstrate color mode utilities usage
- Add vanilla CSS tokens documentation and examples
- Improve code preview component styling