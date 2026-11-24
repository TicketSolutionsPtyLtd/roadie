---
'@oztix/roadie-core': minor
---

`cropImage` fills behind the image before drawing a JPEG, with white by default, so a straightened crop no longer has a dark hairline along its edges, and corners past the turned image come out white rather than black. The new `background` option takes any CSS colour, and gives other types, such as PNG and WebP, a fill too; without it they stay see-through past the image.
