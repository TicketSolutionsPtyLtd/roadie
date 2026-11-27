---
'@oztix/roadie-components': minor
---

Add `useNavigatorCommands` to `@oztix/roadie-components/navigator`, which returns Navigator's destinations, their `Navigator.Secondary` pages, and the saved views listed there as groups of link commands, ready to pass to `CommandPalette` as `items`. Call it inside `<Navigator>`; outside one it returns no commands.
