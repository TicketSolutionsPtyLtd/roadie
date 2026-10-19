---
'@oztix/roadie-core': patch
---

`isUnsafeHref`, and so every Roadie link component, now catches unsafe links hidden with a tab, line break, or control character, such as `java\tscript:` or a leading null character. Browsers ignore those characters and would still run the link.
