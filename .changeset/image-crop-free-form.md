---
'@oztix/roadie-components': minor
---

`ImageCrop` crops free-form when you leave out `aspectRatio`. The frame starts as the whole image, with handles on its corners and edges that resize the crop about its centre; on release the frame grows back to fill the crop area. Each corner is a "resize handle" button whose arrow keys move it, 10px or 50px with Shift. `minWidth` and `minHeight` each cap their own side, a quarter turn turns the frame with the image, and Reset goes back to the whole image.
