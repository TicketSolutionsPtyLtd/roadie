# @oztix/roadie-core

## 1.2.0

### Minor Changes

- d9a0534: Add essential components and design tokens for B2B website development (INNO-170)

  **New Components:**
  - Add Container component for responsive page-level layouts with max-width constraints
  - Add IconButton component for square, icon-only button variant
  - Add Mark component for semantic text highlighting with theme-aware styling
  - Add Highlight component for intelligent search result highlighting using Ark UI
  - Add SpotIllustration system with automated SVG-to-component pipeline and 12 initial illustrations

  **Design Token Enhancements:**
  - Add `brandSecondary` color palette to type system
  - Add `surface.highlight` tokens for all color palettes with hover/active states
  - Update `surface.strong` token colors for improved contrast

  **Font System:**
  - Rename from Inter Variable to Intermission (Oztix's customized version)
  - Enable OpenType features: case, ss03, cv01-cv05, cv08-cv11
  - Subset to Basic Latin (U+0020-007F) and typographic quotes (U+2018-201F) for optimized file size

  **Build System:**
  - Add automated SpotIllustration build pipeline with SVGO optimization and watch mode
  - Add chokidar and svgo dependencies for illustration tooling
  - Add tree-shakeable exports for spot illustrations

## 1.1.0

### Minor Changes

- 6e05fb8: Add color mode utilities and improve design tokens

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

## 1.0.0

### Major Changes

- 8481943: Upgrade to PandaCSS 1.4.3 and Ark UI with modernized component system

  **Breaking Changes:**
  - Upgraded PandaCSS from 0.48.1 to 1.4.3
  - Migrated from React Aria Components to Ark UI factory pattern
  - Button component now uses native HTML props: `disabled` instead of `isDisabled`, `onClick` instead of `onPress`
  - Removed `colors.solid.*` tokens (use `surface.strong` instead)
  - Renamed all `muted` emphasis levels to `subtler` (e.g., `fg.muted` → `fg.subtler`)
  - Changed primary font from Inter Variable to Intermission
  - Refined letter spacing token scale (values changed significantly)
  - Complete rewrite of Text, Heading, Button, and Code components to use Ark UI factory
  - New styled() API for components replacing previous implementation
  - Simplified View component implementation
  - Component props standardized across all components

  **New Features:**
  - All components now support `colorPalette` prop for flexible theming
  - Button component rewritten with `styled()` API and new `xs` size variant
  - Components modernized to use semantic `colorPalette.*` tokens
  - New standardized component API with consistent props across all components
  - Enhanced typings with HTMLStyledProps for comprehensive prop support
  - Updated Text, Heading, Button, and Code components with consistent styling system
  - View is now a PandaCSS pattern component
  - Improved recipe system with shared patterns and consistent APIs

  **Migration:**

  Update Button props:

  ```diff
  - <Button isDisabled onPress={handlePress}>
  + <Button disabled onClick={handlePress}>
  ```

  Replace removed tokens:

  ```diff
  - color: {colors.accent.solid.default}
  + color: {colors.accent.surface.strong}
  ```

  Update emphasis levels:

  ```diff
  - <Text emphasis="muted">
  + <Text emphasis="subtler">
  ```

## 0.2.1

### Patch Changes

- f2aa279: Update neutral solid colors to work better with default button

## 0.2.0

### Minor Changes

- 94d8153: Add new semantic color token system
  - Introduce new color palette structure with semantic tokens
  - Update components to use new color token system
  - Add emphasis and colorPalette props to components
  - Update tests to reflect new token structure

## 0.1.0

### Minor Changes

- Initial pre-release of the Roadie Design System for internal testing
