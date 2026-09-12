---
'@oztix/roadie-components': patch
---

- `List.Item` names a row by its `title` and reads its `subtitle` as the description.
- `List.GroupTitle` takes an element `render`, such as `render={<h3 />}`, to set its heading level.
- `List.Item` marks its leading and trailing slots with `data-slot`.
- `Button` and `IconButton` with `href` are announced as links, not buttons.
- `Logo` stays left to right on right-to-left pages.
