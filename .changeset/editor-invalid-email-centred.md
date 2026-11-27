---
'@oztix/roadie-editor': patch
---

Fix an invalid boxless email editor moving to the frame's start in a frame wider than the email; it stays centred, with its danger edge just outside the email. A block-selected section also keeps its selection ring under the pointer, rather than the quieter hover ring.
