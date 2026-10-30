---
'@oztix/roadie-components': patch
---

Fix Node failing to import `@oztix/roadie-components` and `@oztix/roadie-components/sortable` with `ERR_UNSUPPORTED_DIR_IMPORT`, which broke Vitest in apps that don't inline Roadie. Sortable now bundles Pragmatic drag and drop, whose folder subpaths Node's ESM loader rejects, so the `@atlaskit/pragmatic-drag-and-drop` packages are no longer dependencies. The build now fails if Node can't import any subpath.
