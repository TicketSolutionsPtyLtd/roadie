---
'@oztix/roadie-widgets': minor
---

Cart drawer event rows now show a full schedule and reserved seating, and the
Vue skin is brought to parity with React.

- **Schedules:** events can carry an `eventEndAtUtc` (and venue-local
  `eventEndDateKey`). Rows render a finish time (`7pm – 11pm`) or a multi-day
  range (`6:30pm – Sun 4 Oct, 9pm`) via the new shared
  `formatEventSchedule` / `formatDayShort` core helpers. Existing data without
  end fields is unchanged (start time only).
- **Reserved seats:** `CartTicket.seats` takes **structured** `CartSeat[]`
  (section / row / seat). The new shared `formatSeatRange` core helper groups by
  section + row and collapses consecutive seats into a range (e.g.
  `Stalls B11–12`, `Mezzanine M3 · Circle C5`), so every skin and consumer
  renders seating identically. Shown as a seat-icon badge beside the ticket name.
- **Same-day events** are separated by a hairline divider; event and day-group
  removals animate height + opacity, and the header urgency badge splits into a
  ticket-count badge and a separate countdown badge that animates in/out and
  hides when the cart is empty.
- Header/footer spacing, the drag handle, container-query event images, and the
  remove-confirm popover arrow are refined to match across both skins.

All additions are backward compatible — the new `CartEvent` / `CartTicket`
fields are optional and the new core exports are additive.
