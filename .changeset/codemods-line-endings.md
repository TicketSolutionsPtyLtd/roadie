---
'roadie-skills': patch
---

Fix the `/roadie:migrate` codemods writing Windows line endings into a file that uses `\n`. A file keeps its own line endings, and one with Windows line endings keeps the blank line after `'use client'`.
