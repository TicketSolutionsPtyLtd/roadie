---
'@oztix/roadie-components': minor
---

`ImageCrop` crops free-form when you leave out `aspectRatio`. The frame starts as the whole image, with handles on its corners and edges. A drag keeps the opposite corner or edge where it is, or the centre with Alt, and past the crop area the image zooms out to take in more; on release the frame moves back to the centre and grows to fill the crop area. Each corner is a "resize handle" button whose arrow keys move it the same way, 10px or 50px with Shift. `minWidth` and `minHeight` each set the smallest their own side can be, a quarter turn turns the frame with the image, and Reset goes back to the whole image.
