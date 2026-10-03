/** Saves text as a CSV file, such as one from core's `recordsToCsv`. */
export function downloadCsv(csv: string, filename: string): void {
  // A byte order mark, so Excel reads the file as UTF-8.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers start the download after click returns.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
