---
'@oztix/roadie-components': minor
---

Add `QRCode` for scanning tickets at the gate, from
`@oztix/roadie-components/qr-code`. It encodes `value` at error correction
level H and, by default, puts the Oztix mark on a dark 5×5-module tile in the
centre. Pass `children` to use your own mark, or `branded={false}` for a plain
code. It's always dark on white, whatever the theme or intent, and has no
hooks, so it renders in server components.
