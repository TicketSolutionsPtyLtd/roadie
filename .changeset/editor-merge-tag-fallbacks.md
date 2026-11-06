---
'@oztix/roadie-editor': minor
---

Add `fallback` to `EditorVariable`, which a merge tag takes as it's inserted. A tag for a variable with no fallback opens the merge tag form as it's inserted, with focus in Fallback, and Enter goes back to the text after it. Each chip shows its fallback after its label, as "First name · there", in the subtler text colour, or a warning dot when it has none. The merge tag form's title starts at its edge rather than centred.
