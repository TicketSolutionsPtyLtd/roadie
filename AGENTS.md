# Roadie Design System - Agent Instructions

This file provides guidance to AI coding agents when working with code in this repository.

## Repository Overview

Roadie is a comprehensive design system for Oztix's applications, built as a monorepo using pnpm workspaces and Turborepo. The system provides design tokens, React components, and documentation.

**Tech Stack:**
- Package Manager: pnpm@9.15.0 (use `corepack enable` to ensure correct version)
- Build System: Turborepo
- Framework: React v19.0.0
- Component Primitives: @ark-ui/react (for complex components requiring accessibility)
- Styling: PandaCSS v1.4.3
- Language: TypeScript v5.7
- Documentation: Next.js v15 with MDX

**External Documentation:**
- PandaCSS: https://panda-css.com/llms-full.txt (comprehensive API and usage docs)
- Ark UI: https://ark-ui.com/llms-react.txt (React-specific component docs)

**Recommended MCP Servers:**
To enable AI-assisted component building with Ark UI, install the Ark UI MCP server:
```bash
npx -y @ark-ui/mcp
```
This provides tools for listing components, getting examples, and styling guidelines.

## Monorepo Structure

```
/packages/core/         - Design tokens, themes, PandaCSS preset (@oztix/roadie-core)
/packages/components/   - React component library (@oztix/roadie-components)
/packages/icons/        - Icon package (Coming soon)
/docs/                  - Documentation site (Next.js + MDX)
```

## Common Commands

### Development
```bash
pnpm dev                    # Start development for all packages (docs runs on localhost:3000)
pnpm build                  # Build all packages
pnpm test                   # Run tests across all packages
pnpm typecheck              # Run TypeScript type checking
```

### Code Quality
```bash
pnpm lint                   # Run ESLint
pnpm lint:fix              # Fix ESLint issues
pnpm format                 # Format code with Prettier
pnpm format:check          # Check formatting without changes
```

### Package-Specific Commands
```bash
# Run command in specific package
pnpm --filter @oztix/roadie-core build
pnpm --filter @oztix/roadie-components test

# Core package token building
cd packages/core
pnpm build:tokens          # Build token files from JSON sources
pnpm build:panda           # Generate PandaCSS artifacts

# Components package
cd packages/components
pnpm test:watch            # Run tests in watch mode
pnpm test:ui               # Open Vitest UI

# Documentation
cd docs
pnpm dev                   # Start docs dev server
```

### Versioning and Releases
```bash
pnpm changeset             # Create a changeset for version management
pnpm changeset:version     # Bump versions based on changesets
pnpm changeset:publish     # Publish packages to npm (automated via CI)
```

## Architecture

### Design Tokens System

**Token Sources:**
- `packages/core/src/tokens/tokens.json` - Base design tokens (colors, spacing, typography, etc.)
- `packages/core/src/tokens/semantic-tokens.json` - Semantic tokens that reference base tokens

**Token Build Process:**
1. JSON token files are processed by `build-panda-tokens.js` script
2. Generates Panda-compatible token files in `packages/core/src/tokens/panda/`
3. Also generates Figma-compatible tokens in `packages/core/src/tokens/figma/`
4. PandaCSS preset is exported from `packages/core/src/presets/index.ts`

**Token Usage:**
- Core package exports tokens, PandaCSS preset, and utilities
- Components consume tokens through PandaCSS utilities (`@oztix/roadie-core/css`)
- Preset includes global styles, font-face declarations, and custom conditions

### Component Architecture

**Component Pattern:**
- Simple components use native HTML elements (button, div, etc.)
- Complex components requiring accessibility use @ark-ui/react primitives
- Styled using PandaCSS `cva()` (class variance authority) pattern
- Each component exports typed props and recipe for styling

**Component Structure:**
```
packages/components/src/components/ComponentName/
├── index.tsx              # Component implementation
└── ComponentName.test.tsx # Tests using Vitest + Testing Library
```

**Component Export Strategy:**
- Main entry (`packages/components/src/index.tsx`) re-exports all components
- Build system (tsup) creates separate entry points for tree-shaking
- Each component gets its own chunk for optimal bundle sizes

**Styling Approach:**
- Use semantic tokens via `colorPalette` system (e.g., `colorPalette.fg`, `colorPalette.surface.subtle`)
- Pseudo-classes via `_hover`, `_active`, `_disabled`, `_focusVisible`
- Spacing uses design tokens (e.g., `gap='400'`, `px='200'`)
- Components default to `View` as root element for layout

### Documentation Site

**Structure:**
- Next.js app router in `docs/src/app/`
- MDX content for component documentation
- Live code examples using react-live
- Automatic component prop extraction via react-docgen-typescript

**PandaCSS Integration:**
- Docs site consumes the roadie preset from core package
- Has its own `panda.config.ts` that includes the preset
- Generates styles during development and build

## Development Standards

### TypeScript
- Strict mode enabled
- No explicit `any` types
- No unused variables/parameters
- Consistent file naming (PascalCase for components)

### Styling Rules
1. Use PandaCSS exclusively (no CSS-in-JS)
2. Use semantic tokens, never hardcode colors
3. Don't append `.default` to color tokens (it's redundant)
4. Prefer `gap` over `margin` for spacing
5. Use `View` as root component for layout
6. Use `Text` instead of `span`, `Heading` instead of `h1-h6`

### Component Guidelines
- Components must be fully accessible (ARIA attributes)
- Document all props and variants in the component file
- Use sentence case for content and documentation
- Keyboard navigation must work
- Include loading and error states where applicable

### Code Quality
- ESLint with TypeScript, React, and Prettier plugins
- Prettier configuration:
  - Single quotes
  - No semicolons
  - 2 space indentation
  - 80 character line limit
  - Sorted imports via @trivago/prettier-plugin-sort-imports

### Testing
- Vitest for unit testing (Jest-compatible)
- React Testing Library for component tests
- Tests co-located with components
- Run with coverage tracking

## Git and Release Workflow

### Branch Naming
```
feature/[ticket-number]-description
```

### Release Process
1. Make changes and commit them
2. Create changeset: `pnpm changeset`
   - Select affected packages
   - Choose type: major (breaking), minor (feature), patch (fix)
   - Write description
3. Commit changeset file
4. Create PR with:
   - Ticket number in title
   - Screenshots for visual changes
   - Dev and design approvals required
5. On merge to main:
   - CI automatically versions packages
   - Publishes to npm
   - Deploys documentation site

### Documentation Updates
- Package-related docs: Auto-deployed after release
- Doc-only changes: Auto-deployed on push to main

## Key Dependencies

**Build Tools:**
- tsup - TypeScript bundler for library builds
- Turborepo - Monorepo task orchestration
- PandaCSS - Zero-runtime CSS-in-JS

**Testing:**
- Vitest - Fast unit test runner
- @testing-library/react - Component testing utilities

**Component Foundation:**
- @ark-ui/react - Accessible React component primitives (for complex components)
- React 19 - Latest React with compiler support

## Notes

- The build depends on `packages/core` being built before `packages/components`
- PandaCSS codegen must run before building or testing components
- Token changes require rebuilding the core package
- Documentation site links: https://ticketsolutionsptyltd.github.io/roadie/
