# @oztix/roadie-components

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

### Patch Changes

- 0125940: Added src files to package
- Updated dependencies [8481943]
  - @oztix/roadie-core@1.0.0

## 0.2.1

### Patch Changes

- f2aa279: Update neutral solid colors to work better with default button
- Updated dependencies [f2aa279]
  - @oztix/roadie-core@0.2.1

## 0.2.0

### Minor Changes

- 94d8153: Add new semantic color token system
  - Introduce new color palette structure with semantic tokens
  - Update components to use new color token system
  - Add emphasis and colorPalette props to components
  - Update tests to reflect new token structure

### Patch Changes

- Updated dependencies [94d8153]
  - @oztix/roadie-core@0.2.0

## 0.1.1

### Patch Changes

- 77cd753: Improve build for tree-shaking and code-splitting

## 0.1.0

### Minor Changes

- Initial pre-release of the Roadie Design System for internal testing

### Patch Changes

- Updated dependencies
  - @oztix/roadie-core@0.1.0
