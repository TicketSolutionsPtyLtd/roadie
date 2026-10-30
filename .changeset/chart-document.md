---
'@oztix/roadie-core': minor
---

Add `chartDocumentSchema` and `validateChartDocument` to `@oztix/roadie-core/dashboard`, in beta. A chart document is one chart card without the dashboard around it, `{ version: 1, kind: 'chart', label, source, plot }`, with an optional headline value or takeaway. `validateChartDocument(input)` returns `{ ok, problems }` like `validateDashboard`, runs the same plot and copy checks, with paths from the document's root such as `plot.y`, and rejects `selectsPeriod`, since a document has no period. The shape may change until the documents package agrees with it.
