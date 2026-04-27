---
'@oztix/roadie-components': minor
---

Add `Tabs` compound built on Base UI Tabs. Four `emphasis` presets (`strong`,
`normal`, `subtle`, `subtler`) share a single animated `<Tabs.Indicator>`
whose geometry follows the active tab via Base UI's `--active-tab-*` CSS
variables, with `prefers-reduced-motion` honoured. Roadie's `direction`
prop renames Base UI's `orientation`; vertical mode left-aligns tab content
and swaps the `subtler` underline onto the left edge. Per-file leaves with
a server-safe `index.tsx` keep the compound RSC-safe via both the new
`@oztix/roadie-components/tabs` subpath and the root barrel.
