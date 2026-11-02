---
'@oztix/roadie-components': minor
---

Add `flush` to `Toolbar`, for a bar docked along an edge. A flush toolbar drops its border, shadow, and pill shape, and `emphasis` sets only its fill. Its controls keep the inset every toolbar has, so a hover or focus ring never meets the edge. The parent draws any edge, with `border-b border-subtler` or similar, and clips the corners with `overflow-clip`.
