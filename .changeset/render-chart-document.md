---
'@oztix/roadie-charts': minor
---

Add `renderChartDocument` to `@oztix/roadie-charts/static`, in beta. It draws a chart document from `@oztix/roadie-core/dashboard` as one standalone SVG file, with the label, context and headline value or takeaway above the plot and the source below it, for every plot kind including `static` and `small-multiples`. It validates the document first and throws a `ChartDocumentError` with the problems. `/static` still loads no React.
