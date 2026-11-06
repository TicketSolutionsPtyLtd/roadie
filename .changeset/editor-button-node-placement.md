---
'@oztix/roadie-editor': patch
---

Keep the editor's block toolbars and Button settings clear of what's around them. Button settings opens under the button rather than over it, as a half-height sheet below 480px, over an unblurred page with the button scrolled above it, and with focus on Emphasis, or on Link while the button has no link yet. The Columns toolbar sits past the columns' end where there's room, else above their end where that covers no text, else in their top-end corner, never below them over the next block's controls. The Spacer toolbar sits past the spacer's end where the frame has room, or inside it on a narrow screen. An image's or embed's toolbar stays under the docked toolbar as the image scrolls under it, rather than drawing over it.
