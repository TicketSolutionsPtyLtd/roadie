---
'@oztix/roadie-widgets': patch
---

The `motion` peer range now accepts `^14.0.0` alongside 12 and 13. Motion 14
only removes internal APIs the widgets never used, so the cart drawer and cart
contents behave the same on all three.
