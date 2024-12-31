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

## Development Process

1. Ensure you have the correct Node.js version installed (see `.nvmrc`)
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a feature branch from `main` using the format: `feature/[ticket-number]-description`
4. Make your changes following our component guidelines
5. Test your changes locally using the Turborepo pipeline
6. Create a pull request with the ticket number in the title

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

We use [changesets](https://github.com/changesets/changesets) to manage versioning and releases. Follow these steps when making changes:

1. Make your changes in a feature branch
2. Run `pnpm changeset` to create a changeset
3. Follow the prompts to:
   - Select which packages are affected
   - Choose the type of change (major/minor/patch)
   - Write a description of your changes
4. Commit the generated changeset file with your changes
5. Create your pull request

The changeset should include:

- What changes were made
- Why the changes were made
- Any migration steps required

### Types of Changes

- `major`: Breaking changes that require user action
- `minor`: New features, non-breaking API additions
- `patch`: Bug fixes, documentation updates, internal changes

### Release Process

Releases are managed by the maintainers. When changes are ready to be released:

1. Changesets are accumulated on the main branch
2. Maintainers run the release workflow
3. Changesets automatically update versions and changelogs
4. New versions are published to the registry

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
