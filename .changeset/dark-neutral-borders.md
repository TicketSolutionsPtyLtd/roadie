---
'@oztix/roadie-core': patch
---

Raise neutral `border-subtle`, `border-normal`, and `border-strong` one step in
dark mode, to neutral steps 7, 8, and 10, so neutral borders stand out more
against dark surfaces. Light mode, `border-subtler`, and the other intents are
unchanged. Anything drawn with these borders in dark mode, such as
`emphasis-normal` cards, table and list dividers, separators, and chart axes,
is a little lighter.
