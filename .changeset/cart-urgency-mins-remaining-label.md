---
'@oztix/roadie-widgets': patch
---

The cart urgency badge now shows the full "x mins remaining to checkout" label
in `CartContents` and in `CartDrawer` (when open), including when more than 5
minutes remain. The "remaining to checkout" tail previously only rendered in the
under-5-minute (mm:ss) format, so the long format showed a bare "5 mins";
`CartContents` also never revealed the tail because it passed no `progress`.
The ticket-count pill likewise reveals its full "x tickets" label (singular "1
ticket") in the same places, using the same progress-driven reveal. React and
Vue parity preserved; the drawer's collapsed peek state is unchanged.
