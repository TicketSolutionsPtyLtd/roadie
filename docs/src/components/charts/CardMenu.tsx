'use client'

import {
  ArrowRightIcon,
  CopyIcon,
  DownloadIcon,
  EyeSlashIcon,
  ImageIcon,
  PencilSimpleIcon,
  TrashIcon
} from '@phosphor-icons/react'

import type { ChartTable } from '@oztix/roadie-charts/tables'
import { DataCard } from '@oztix/roadie-components/data-card'
import { Menu } from '@oztix/roadie-components/menu'

function csvField(value: unknown) {
  const text = Array.isArray(value) ? value.join(' ') : String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function tableCsv({ columns, rows }: ChartTable) {
  const lines = [
    columns.map((column) => csvField(column.header)),
    ...rows.map((row) => columns.map((column) => csvField(row[column.key])))
  ]
  return lines.map((line) => line.join(',')).join('\n')
}

function downloadCsv(label: string, table: ChartTable) {
  const url = URL.createObjectURL(
    new Blob([tableCsv(table)], { type: 'text/csv' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
  link.click()
  // Revoking in the same task can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url))
}

export function CardMenu({
  label,
  table
}: {
  label: string
  table?: ChartTable
}) {
  return (
    <Menu>
      <Menu.Trigger render={<DataCard.MoreButton label={label} />} />
      <Menu.Content align='end'>
        <Menu.Group>
          <Menu.GroupLabel>Chart</Menu.GroupLabel>
          <Menu.Item icon={<PencilSimpleIcon weight='bold' />}>Edit</Menu.Item>
          <Menu.Item icon={<CopyIcon weight='bold' />}>Duplicate</Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.GroupLabel>Display</Menu.GroupLabel>
          <Menu.Item icon={<EyeSlashIcon weight='bold' />}>
            Hide description
          </Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.GroupLabel>Export</Menu.GroupLabel>
          {table && (
            <Menu.Item
              icon={<DownloadIcon weight='bold' />}
              onClick={() => downloadCsv(label, table)}
            >
              Download CSV
            </Menu.Item>
          )}
          <Menu.Item icon={<ImageIcon weight='bold' />}>
            Copy as image
          </Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.GroupLabel>Dashboard</Menu.GroupLabel>
          <Menu.Item icon={<ArrowRightIcon weight='bold' />}>Move to</Menu.Item>
          <Menu.Item intent='danger' icon={<TrashIcon weight='bold' />}>
            Remove from dashboard
          </Menu.Item>
        </Menu.Group>
      </Menu.Content>
    </Menu>
  )
}
