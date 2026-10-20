---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

Add each component's status to `roadie.manifest.json` even when another page documents it, such as `CheckboxGroup` on the Checkbox page or `Records` on Records model, and add `docs` and `status` to core's records subpaths. Status is one of `alpha`, `beta`, `stable`, or `deprecated`, as the docs define them: alpha can break in a minor release, beta is settling and marks a breaking change as Breaking, stable follows semver, and deprecated is being removed. Many long-standing components are now `stable`, and `RecordTable`, `RecordGrid`, `QueryField`, and the records model are `alpha`.
