---
'@oztix/roadie-core': minor
---

Add `accentFromPixels` to `@oztix/roadie-core/colors`, which returns an accent hex for `ThemeProvider`'s `accentColor` from an image's raw RGBA or RGB bytes, such as a canvas's `ImageData.data` or a server image library's buffer. It picks the image's most vivid hue and returns `null` for an image with no usable colour (grey, near white, near black, or transparent), so the accent around it stays. Pure and synchronous, and about 0.8 kB.
