---
'@oztix/roadie-components': minor
---

Add `Avatar`, a person's photo with initials or an icon behind it, built on Base
UI's avatar primitive. `<Avatar src name />` covers most uses: it draws initials
from `name`, falls back to a user icon without one, and shows whichever is
underneath if the photo fails. `Avatar.Image` and `Avatar.Fallback` compose it
by hand, and the image stays mounted so it lazy loads and can render through
Roadie `Image`. Sizes run `xs` to `xl`, `shape` is `circle` or `square`, and the
fallback takes the surrounding intent. `Avatar.Group` overlaps a row of avatars
with a ring in the page colour, and `Avatar.GroupCount` ends it with `+N`.
`getInitials` is exported too.
