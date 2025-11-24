---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

Add essential components and design tokens for B2B website development (INNO-170)

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
