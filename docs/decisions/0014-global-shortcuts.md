# 0014 Global shortcuts

## Context

CommandPalette opens with ⌘K, or Ctrl+K off Apple platforms, from anywhere on
a page (INNO-1607). The editor and other fields use the same keys for
themselves, a page can mount more than one palette, and a trigger or
`Navigator.Search` elsewhere on the page has to reach the one that owns the
keys.

## Decision

A component that owns a page-wide shortcut binds it on `document`, by
default, and takes `shortcut={false}` to bind nothing. It leaves a key that is
already `defaultPrevented`, so a field that handles the same keys keeps them;
the editor's link shortcut does. One per page owns the keys: it registers
itself, the last one mounted wins, and a second one warns in development.
Triggers open the registered one.

## Consequences

A field that wants the keys calls `preventDefault`, and there is no opt-out
attribute. A page with several palettes sets `shortcut={false}` on all but
one, as the docs site does; a docs example whose palette must bind the keys
runs in its own frame instead (`framed`, INNO-1640). There is no app-wide
hotkey API; the next global shortcut reuses this pattern, and a shared one
waits until two need it.

## Links

- INNO-1607, CommandPalette's shortcut
- `packages/components/src/components/CommandPalette/registry.ts`
