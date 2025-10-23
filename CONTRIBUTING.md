# Contributing to Roadie Design System

Welcome to the Roadie Design System contribution guide! This document outlines how we work together to maintain and improve our shared design system.

## Project Structure

Our design system is organized as a monorepo using pnpm workspaces and Turborepo:

```
roadie/
├── packages/
│   ├── core/          # Design tokens, themes, and utilities
│   └── components/    # React component library
├── docs/             # Documentation site
└── package.json      # Root workspace configuration
```

## AI Coding Agents

This project uses `AGENTS.md` as the single source of truth for AI coding agent instructions. This file provides context and guidelines to AI tools like Claude Code, Cursor, GitHub Copilot, and others.

- **Source file:** `AGENTS.md` (edit this file when updating agent instructions)
- **Legacy compatibility:** `CLAUDE.md` is a symlink to `AGENTS.md` for backwards compatibility

When making changes to project structure, conventions, or workflows, consider updating `AGENTS.md` to help AI tools provide better assistance to contributors.

## Development Process

1. Ensure you have the correct Node.js version installed (see `.nvmrc`)
2. Enable corepack to ensure the correct pnpm version:
   ```bash
   corepack enable
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a feature branch from `main` using the format: `feature/[ticket-number]-description`
5. Make your changes following our component guidelines
6. Test your changes locally using the Turborepo pipeline
7. Create a pull request with the ticket number in the title

## Component Development Standards

When creating or modifying components:

1. Components should be created in `packages/components/src/`
2. Follow the component structure:

   ```
   ComponentName/
   ├── index.tsx       # Component implementation and styled-components
   └── Component.test.tsx
   ```

3. Component Checklist:
   - [ ] TypeScript types are complete
   - [ ] Component is responsive
   - [ ] Keyboard navigation works
   - [ ] ARIA attributes implemented
   - [ ] Error states handled
   - [ ] Loading states included
   - [ ] Tests written

## Design Tokens

Design tokens are managed in `packages/core`:

1. Update tokens in the appropriate files under `packages/core/src/tokens/`
2. Run the build process to generate updated token files:
   ```bash
   pnpm build
   ```
3. Test the changes across components
4. Update documentation if necessary

## Testing Requirements

Run the full test suite before submitting:

```bash
pnpm test
```

Ensure your changes pass:

- TypeScript compilation
- ESLint rules (`pnpm lint`)
- Unit tests
- Visual regression tests
- Accessibility checks

## Documentation

- Update component documentation in `docs/`
- Include usage examples
- Document props and variants
- Add accessibility considerations
- Update the changelog

### Documentation writing guidelines

- Cursor rules should follow these same rules and is helpful for writing documentation intially
- Use sentence case for headings, titles, and other content
- Keep documentation concise and focused on one topic per section
- Use active voice and present tense
- Include practical code examples for each concept
- Structure content with clear headings and subheadings
- Use lists and tables to organize information
- Explain technical terms when first introduced
- Include "dos and don'ts" where applicable
- Link to related documentation when referencing other topics
- Keep code examples simple and focused on the concept being explained
- Use consistent terminology throughout documentation
- Include troubleshooting sections for complex features
- Write in a friendly, conversational tone
- Highlight important information using callouts or blockquotes
- Keep paragraphs short and scannable (3-4 sentences max)

## Pull Request Process

1. Link the relevant ticket
2. Include before/after screenshots for visual changes
3. Ensure all checks pass in CI
4. Get approvals from:
   - At least one developer
   - Design team (for visual changes)

## Versioning and Releases

We use [changesets](https://github.com/changesets/changesets) to manage versioning and releases. The process is automated through GitHub Actions.

### Creating a Release

1. **Make your changes** in a feature branch and commit them:

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

2. **Create a changeset** (after your changes are complete):

   ```bash
   pnpm changeset
   ```

   - Select affected packages (core/components)
   - Choose change type: `major`, `minor`, or `patch`
   - Write a clear description of your changes (this appears in the changelog)

3. **Commit the changeset file**:

   ```bash
   git add .changeset/*.md
   git commit -m "chore: add changeset"
   ```

4. **Create and merge your pull request**:
   - CI automatically runs tests on your PR
   - Get required reviews (developer + design for visual changes)
   - Merge to main when approved

### Automated Release Process

After your PR merges to main, the release automation kicks in:

#### Step 1: Version Packages PR Created

When changesets are detected in `main`:

- A "Version Packages" PR is automatically created or updated
- This PR shows:
  - All version bumps for affected packages
  - Updated CHANGELOG.md files with your changeset descriptions
  - Package.json version updates
- Multiple changesets accumulate in this PR until it's merged

#### Step 2: Publishing

When the "Version Packages" PR is merged:

- Packages are built using Turborepo (with caching for speed)
- Packages are published to npm with provenance (cryptographic link to source)
- GitHub releases are automatically created with changelog notes
- Documentation site is rebuilt and deployed to GitHub Pages

### Documentation Updates

Documentation updates follow different paths depending on the change:

**Package-related changes** (components, tokens, etc.):

- Docs rebuild and deploy automatically after packages publish
- Ensures documentation matches the published package versions

**Documentation-only changes** (guides, tutorials, fixes):

- Merge PR to main
- Docs automatically rebuild and deploy
- No release process or changeset needed

### Types of Changes

Choose the appropriate version bump based on the impact:

- **`major` (1.0.0)**: Breaking changes requiring user action (API changes, removals)
- **`minor` (0.1.0)**: New features, non-breaking additions (new components, new props)
- **`patch` (0.0.1)**: Bug fixes, documentation updates, internal improvements

### Multiple Changes

If multiple PRs with changesets merge before the Version Packages PR is merged:

- The Version Packages PR automatically updates to include all changes
- All version bumps are calculated together (e.g., two patches = one patch, patch + minor = minor)
- All changelog entries are combined
- Everything publishes together when the Version Packages PR merges

### CI/CD Workflows

Our GitHub Actions workflows:

- **CI**: Runs on all PRs and pushes to main (lint, typecheck, test, build)
- **Release**: Runs on main when `.changeset/` or `packages/` change
- **Docs**: Runs on main when `docs/` or `packages/` change

All workflows use Turborepo for intelligent caching and parallelization.

## Style Guide

- Use TypeScript for all new code
- Follow the project's ESLint and Prettier configuration
- Use styled-components for styling
- Follow semantic HTML principles
- Maintain mobile-first responsive design

## Local Development

1. Start the development environment:
   ```bash
   pnpm dev
   ```
2. Visit the documentation site at `localhost:3000`
3. Make changes and see them live-reload

## License

This project is licensed under the ISC License. By contributing to Roadie Design System, you agree that your contributions will be licensed under its ISC License. See the [LICENSE](LICENSE) file for details.

## Questions?

Reach out to the design system team for help!
