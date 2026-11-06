---
'@oztix/roadie-editor': patch
---

Line up text in email columns with the text around them, on the canvas and in the sent email. `renderEmail` now pads a columns row 12px a side, so each column's text sits 24px in, as every other block's does, rather than 12px further out. On the canvas, columns no longer reach past their section, so their outlines line up with the section's, and a column block's grip sits where any other block's does. Columns also sit side by side from a 480px canvas, the width the email stops stacking them at, rather than from 528px.
