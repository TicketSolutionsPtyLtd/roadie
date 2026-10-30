---
'@oztix/roadie-core': patch
---

- `emphasis-subtler` keeps its hover fill when a build lowers CSS nesting, as Next does. Its rest rule had compiled to an `:is()` that outranked the hover.
- Text inside italics stays italic under another mark, such as an underline or a link. The reset now sets only the elements browsers slant upright.
