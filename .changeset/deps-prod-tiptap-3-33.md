---
'@oztix/roadie-editor': patch
'@oztix/roadie-components': patch
'@oztix/roadie-charts': patch
---

Update dependencies: Tiptap 3.33.0 in `@oztix/roadie-editor`, `@tanstack/react-virtual` 3.14.26 in `@oztix/roadie-components`, and `@tanstack/charts` and `@tanstack/react-charts` 1.4.0 in `@oztix/roadie-charts`. Tiptap's static renderer now nests saved marks in the order the editor does, so `renderEditorValue` and `renderEditorHtml` drop their own reordering and render the same HTML as before.
