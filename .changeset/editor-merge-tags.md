---
'@oztix/roadie-editor': minor
---

Add merge tags to the email preset. A `variable` node saves a merge tag as its key and an optional fallback, never its token, and can sit in text or a button's label. `renderEmail` takes the app's `variables`, each with its tokens, and a `syntax`, `ae` (`#FirstName#`) or `liquid` (`{{ customer.first_name }}`), and writes each variable as its token in that syntax, or as its value from `values` for a preview. It throws on a variable the list doesn't have, or one with no token in the syntax, and writes text an author typed that reads as a token so no sending system fills it.
