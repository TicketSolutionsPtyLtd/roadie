---
'@oztix/roadie-editor': minor
---

Update the email canvas's stylesheet rules to sit in the components layer where they don't have to beat a class, so a utility class that reaches them now wins: the email's colours, its links, rules and selection, the handle gutter, a section look's colours, heading sizes, and a section's Settings. The block spacing, the email's padding, the emphasis and merge tag colours, and the phone layout of the grip and add button stay outside a layer, since they beat Prose's flow, the text's padding, and the `emphasis-*`, `intent-*`, and `btn` classes.
