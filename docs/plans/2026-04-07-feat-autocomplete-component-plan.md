---
title: 'feat: Add Autocomplete component'
type: feat
status: active
date: 2026-04-07
---

# Add Autocomplete Component

## Overview

Add an `Autocomplete` component that wraps `@base-ui/react/autocomplete` (available in v1.3.0). Autocomplete is a free-text input with suggestions — the user's typed value is always valid, and suggestions optionally autocomplete the typed content. This is distinct from Combobox (which requires selecting from the list).

The UI should match the existing Combobox component's visual design — same InputGroup styling, popup, items, etc. — since Autocomplete shares most sub-components with Combobox at the Base UI level.

## Problem Statement / Motivation

The Combobox docs (lines 247-259) already position Autocomplete as a planned component:

> "Autocomplete will be for **free-text input with suggestions** — the user's typed value is always valid, suggestions just help. Think address fields or search bars."

Common use cases: address fields, search bars, tag input, any free-text field where suggestions help but aren't required.

## Proposed Solution

Wrap `@base-ui/react/autocomplete` following the exact same compound component pattern as Combobox. Most sub-components share identical Base UI primitives — the key differences are:

1. **AutocompleteRoot** — different root (no `selectionMode`, uses `value`/`onValueChange` for the input string instead of selected item)
2. **AutocompleteValue** — new sub-component to display current value (no Combobox equivalent)
3. **No ItemIndicator** — since there's no "selected" state in the traditional sense, omit ItemIndicator from the compound export (users can still add it if needed via custom rendering)
4. **No Trigger by default** — Autocomplete typically doesn't need a dropdown trigger (it opens on type), but include it as an optional sub-component

## Technical Considerations

### Base UI Autocomplete Architecture

Base UI's Autocomplete re-exports most Combobox sub-components with aliased types. The unique parts are:

- `AutocompleteRoot` — accepts `value`/`defaultValue`/`onValueChange` (string-based, not item-based)
- `AutocompleteValue` — renders current value as text or via render function
- `mode` prop — controls filtering + inline autocompletion: `'list'` (default), `'both'`, `'inline'`, `'none'`
- `submitOnItemClick` — useful for search-bar forms
- No `selectionMode`, `selectedValue`, or `fillInputOnItemPress`

### Shared Styling

The InputGroup CVA variants should be **identical** to Combobox's `comboboxInputGroupVariants` (same emphasis, size, intent options, same `is-interactive-field-group` utility). Consider whether to:

- **Option A**: Duplicate the CVA (simpler, follows existing pattern where each component owns its variants)
- **Option B**: Extract shared `inputGroupVariants` used by both

**Recommendation**: Option A — duplicate. It's the existing pattern, keeps components independent, and the CVA is small. If they diverge later, no coupling to manage.

### Sub-components to include

| Sub-component | Source              | Notes                                                    |
| ------------- | ------------------- | -------------------------------------------------------- |
| `Root`        | `AutocompleteRoot`  | Unique — string value API                                |
| `Value`       | `AutocompleteValue` | New — no Combobox equivalent                             |
| `Label`       | Combobox pattern    | Same styling                                             |
| `InputGroup`  | Combobox pattern    | Same CVA variants                                        |
| `Input`       | Combobox pattern    | Same styling                                             |
| `Trigger`     | Combobox pattern    | Optional — included but not shown in default example     |
| `Clear`       | Combobox pattern    | Same styling                                             |
| `Portal`      | Combobox pattern    | Passthrough                                              |
| `Positioner`  | Combobox pattern    | Same defaults                                            |
| `Popup`       | Combobox pattern    | Same styling                                             |
| `List`        | Combobox pattern    | Same styling                                             |
| `Item`        | Combobox pattern    | Same styling (no ItemIndicator in default examples)      |
| `Collection`  | Combobox pattern    | Passthrough                                              |
| `Group`       | Combobox pattern    | Same styling                                             |
| `GroupLabel`  | Combobox pattern    | Same styling                                             |
| `Empty`       | Combobox pattern    | Same styling                                             |
| `Status`      | Combobox pattern    | Same sr-only pattern                                     |
| `Separator`   | New from Base UI    | `@base-ui/react` Separator (re-exported by Autocomplete) |

### Key API Differences from Combobox

| Prop                | Combobox                | Autocomplete                                   |
| ------------------- | ----------------------- | ---------------------------------------------- |
| `value`             | Selected item value     | Input string value                             |
| `onValueChange`     | Item selection callback | Input change callback                          |
| `mode`              | N/A                     | `'list'` \| `'both'` \| `'inline'` \| `'none'` |
| `submitOnItemClick` | N/A                     | `boolean` (default `false`)                    |
| `openOnInputClick`  | `true` (typical)        | `false` (default — opens on type)              |

## Acceptance Criteria

### Component (`packages/components/src/components/Autocomplete/index.tsx`)

- [ ] Wraps `@base-ui/react/autocomplete` with `AutocompletePrimitive` alias
- [ ] Exports `autocompleteInputGroupVariants` CVA (same shape as Combobox)
- [ ] Exports `useFilter` and `useFilteredItems` hooks from Base UI
- [ ] Exports `Filter`/`FilterOptions` types
- [ ] All sub-components follow the Combobox wrapping pattern (interface extends ComponentProps, destructure className, cn() merge, displayName)
- [ ] `AutocompleteValue` sub-component included
- [ ] Compound export via `Object.assign(AutocompleteRoot, { ... })`
- [ ] All prop types exported individually (`AutocompleteRootProps`, `AutocompleteInputProps`, etc.)
- [ ] `'use client'` directive at top

### Tests (`packages/components/src/components/Autocomplete/Autocomplete.test.tsx`)

- [ ] Renders root component (smoke test)
- [ ] Default variant classes on CVA function
- [ ] Intent variant assertions
- [ ] Emphasis variant assertions
- [ ] Size variant assertions
- [ ] Label sub-component rendering
- [ ] Custom className merge

### Barrel Export (`packages/components/src/index.tsx`)

- [ ] Export `Autocomplete`, `autocompleteInputGroupVariants`, `useFilter`, `useFilteredItems`
- [ ] Export all sub-component prop types
- [ ] Export `Filter`/`FilterOptions` types (re-export from Autocomplete, aliased if needed to avoid collision with Combobox exports)

### Documentation (`docs/src/app/components/autocomplete/page.mdx`)

- [ ] Metadata: title `Autocomplete`, description, status `beta`, category `Inputs`
- [ ] Import section
- [ ] Default example — simplest usage (input with suggestions, no trigger)
- [ ] Emphasis section — normal/subtle
- [ ] Sizes section — sm/md/lg
- [ ] States section — default + disabled
- [ ] Composition examples:
  - With label and clear button
  - With trigger button (showing optional trigger)
  - With groups
  - As search form (`submitOnItemClick`)
- [ ] Guidelines section:
  - When to use Autocomplete vs Combobox vs Select (update the existing comparison table from Combobox docs)
  - Filtering explanation
  - Async loading pattern
  - Mode explanation (`list`, `both`, `inline`, `none`)
- [ ] Keyboard behaviour
- [ ] Accessibility section
- [ ] PropsDefinitions
- [ ] Update Combobox docs: change "Autocomplete (future)" to link to the new Autocomplete page

### CSS Safelist

- [ ] Verify all utility classes used by Autocomplete are already in safelist (they should be, since they match Combobox)

## Implementation Sequence

### Phase 1: Component

1. Create `packages/components/src/components/Autocomplete/index.tsx`
   - Copy Combobox structure, replace `ComboboxPrimitive` with `AutocompletePrimitive` from `@base-ui/react/autocomplete`
   - Rename all sub-component functions/types from `Combobox*` to `Autocomplete*`
   - Add `AutocompleteValue` sub-component
   - Add `useFilteredItems` export (new hook available in autocomplete)
   - Remove `ItemIndicator` from compound export (not applicable — users can add via custom Item children)
   - Adjust Root props typing to match `AutocompleteRoot.Props`
2. Create `packages/components/src/components/Autocomplete/Autocomplete.test.tsx`
3. Add exports to `packages/components/src/index.tsx`
4. Run `pnpm typecheck` and `pnpm test`

### Phase 2: Documentation

5. Create `docs/src/app/components/autocomplete/page.mdx`
6. Update `docs/src/app/components/combobox/page.mdx` — link to Autocomplete instead of "(future)"
7. Run `pnpm --filter docs dev` to verify examples render

## Sources & References

- **Base UI Autocomplete docs**: https://base-ui.com/react/components/autocomplete
- **Base UI Autocomplete types**: `node_modules/@base-ui/react/autocomplete/root/AutocompleteRoot.d.ts`
- **Existing Combobox implementation**: `packages/components/src/components/Combobox/index.tsx`
- **Combobox tests**: `packages/components/src/components/Combobox/Combobox.test.tsx`
- **Combobox docs**: `docs/src/app/components/combobox/page.mdx`
- **Component doc template**: `docs/COMPONENT_DOC_TEMPLATE.md`
- **CVA pattern reference**: `packages/components/src/components/Select/index.tsx`
