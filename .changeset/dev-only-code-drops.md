---
'@oztix/roadie-components': patch
'@oztix/roadie-charts': patch
'@oztix/roadie-editor': patch
---

An app's production build now drops Roadie's dev-only warnings and component `displayName`s, as it already does Base UI's. Each is behind a `process.env.NODE_ENV !== 'production'` check written in place, which every mainstream bundler removes. In production, React DevTools shows the components' function names rather than names such as `Card.Root`.
