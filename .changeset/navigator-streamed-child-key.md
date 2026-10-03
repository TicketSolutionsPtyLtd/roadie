---
'@oztix/roadie-components': patch
---

Navigator no longer logs React's "Each child in a list should have a unique
key" warning when a route's child streams in. It used to copy its children
with `Children.toArray` to lift out `Navigator.Primary`, and those re-keyed
copies flagged a child that had skipped JSX's key check, such as a promise
React unwraps. It now renders the rest of its children as given, so apps no
longer need to wrap route children in a fragment.
