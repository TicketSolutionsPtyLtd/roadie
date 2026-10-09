---
'@oztix/roadie-core': minor
---

Dark mode delta text now meets APCA Lc 60 on a data card, the minimum for
labels in decision 0010. Two dark status colours change, so `Delta`, and any
chart mark or text that uses them, looks different in dark mode:

- `--chart-status-good` follows `--color-success-11` instead of
  `--color-success-9`, a lighter aqua (Lc 81.0, was 57.4).
- `--chart-status-critical` is a fixed `oklch(0.798 0.116 20)`, a lighter coral
  red (Lc 63.3, was 47.5), instead of following `--color-danger-9`.

`chartHex('dark')` and `palette.status` return the new values. Light mode and
the warning and serious statuses are unchanged.
