---
'@oztix/roadie-components': patch
'@oztix/roadie-core': patch
'roadie-skills': patch
---

Update `DataCard` labels to wrap to two lines, then truncate, so a chart card's title such as "Tickets sold by ticket type" fits beside the Chart/Table switch and More. Actions sit on the label's first line, so they line up across a row of cards. A `stat` label still truncates on one line, so the values in a row of stat tiles line up. `COPY_LIMITS` labels grow to 66 characters at `sm` and `md` and 80 at `lg` and `full`, `CHART_LABEL_LIMITS` to 42 and 50, and `ACTIONS_LABEL_LIMITS` to 29 and 42, so `validateDashboard` warns about a card label only past two lines. Stat labels and context lines keep their one-line limits.
