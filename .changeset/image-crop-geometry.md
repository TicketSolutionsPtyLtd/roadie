---
'@oztix/roadie-core': minor
---

Add crop geometry to `@oztix/roadie-core/image`: `coverZoom` gives the least zoom at which an image, turned by a rotation, covers a frame; `clampCrop` keeps an `ImageCropValue` covering the frame, inside the turned image, and no smaller than a `min` size; `cropValueAt` fills in a crop's area from its percent or the other way round; and `rubberBand` resists a drag past an edge.
