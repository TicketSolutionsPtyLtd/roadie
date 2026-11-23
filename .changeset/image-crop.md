---
'@oztix/roadie-components': minor
---

Add `ImageCrop` (`@oztix/roadie-components/image-crop`), for cropping an image to a ratio. The image pans and zooms under a fixed frame: drag it, use the arrow keys, `+` and `-`, or scroll once the crop area has focus. It always covers the frame, and `minWidth` and `minHeight` stop zooming before the crop drops below them. `shape='circle'` masks the frame as a circle. `onValueChange` reports an `ImageCropValue` once the image loads, unless a given value already fits, and once each gesture or key press ends, with the crop's `area` in the image's own pixels and as a `percent`.
