---
'roadie-skills': minor
---

`/roadie:implement` ends a user-visible change with an explore gate before it
hands off to `/roadie:demo`. In the preview, it drives each changed
interaction, runs a keyboard-only pass, opens every overlay, tries edge
content, and reads the console, with the repo's headless Playwright or a
browser MCP the session has. Each bug it finds becomes a failing test before
the fix. `/roadie:pr` puts what the pass exercised, and what it didn't, under
Evidence, and `/roadie:demo` reuses the gate's preview.
