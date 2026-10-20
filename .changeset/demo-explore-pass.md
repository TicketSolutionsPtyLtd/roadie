---
'roadie-skills': minor
---

`/roadie:demo` has an explore step before the screenshots: it drives the
changed UI in the preview (each changed interaction, a keyboard-only pass,
every overlay, edge content, and the console), with the repo's headless
Playwright or a browser MCP the session has. Each bug it finds becomes a
failing test before the fix. `/roadie:pr` puts what the pass exercised, and
what it didn't, under Evidence.
