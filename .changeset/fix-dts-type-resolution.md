---
'@oztix/roadie-components': patch
---

Fix .d.ts type resolution for pnpm consumers. Use named prop types with type aliases instead of ComponentProps, add RefAttributes for ref forwarding, and move @base-ui/react and class-variance-authority to peer dependencies so consumers can resolve exported types. Adds attw and check:dts build guards to prevent regressions.
