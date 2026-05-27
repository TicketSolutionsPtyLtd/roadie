---
"@oztix/roadie-widgets": major
---

First stable release. Re-publish with a clean manifest: the `workspace:*`
dependency ranges (`@oztix/roadie-core`, `@oztix/roadie-components`) are now
rewritten to concrete semver ranges at publish time, so the package installs
cleanly outside the monorepo. The previously published `0.1.0` leaked the raw
`workspace:*` protocol and failed to resolve for external consumers.
