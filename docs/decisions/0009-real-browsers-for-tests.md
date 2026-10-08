# 0009 Browser tests use real browsers

## Context

Browser tests cost a lot of CPU locally, so lighter browsers were considered.
Lightpanda doesn't render. Obscura renders with its own layout engine, but no
user runs it and its README says rendering may differ from Chromium.

## Decision

Browser tests run only in Chromium, WebKit, and Firefox. The tests exist to
measure layout and catch differences between engines people use.

## Consequences

Local cost is cut through the runner defaults instead (INNO-1105).

## Links

- [`AGENTS.md`, Testing](../../AGENTS.md#testing)
- INNO-1160 comments
