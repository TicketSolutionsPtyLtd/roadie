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

We use [changesets](https://github.com/changesets/changesets) to manage versioning and releases. The process is automated through GitHub Actions:

1. Make your changes in a feature branch and commit them first:

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

2. Create a changeset (after your changes are complete):

   ```bash
   pnpm changeset
   ```

   - Select affected packages
   - Choose change type (major/minor/patch)
   - Write a description of your changes

3. Commit the changeset file:

   ```bash
   git add .changeset/*.md
   git commit -m "chore: add changeset"
   ```

4. Create and merge your pull request
   - CI will validate your changes
   - Get required reviews
   - When merged to main:
     - Packages are automatically versioned
     - GitHub release is created
     - Packages are published to npm
     - Documentation is rebuilt and deployed

### Documentation Updates

Documentation updates follow two paths:

1. Package-related changes:

   - Docs are automatically rebuilt and deployed after a release
   - Ensures docs match the latest published version

2. Doc-only changes:
   - Push changes to main
   - Docs are automatically deployed
   - No release process needed

### Types of Changes

- `major` (1.0.0): Breaking changes that require user action
- `minor` (0.1.0): New features, non-breaking API additions
- `patch` (0.0.1): Bug fixes, documentation updates, internal changes

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
