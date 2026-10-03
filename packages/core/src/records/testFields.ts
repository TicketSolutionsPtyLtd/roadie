import type { RecordField } from './types'

export const eventFields: RecordField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  {
    key: 'orderNumber',
    label: 'Order number',
    type: 'text',
    match: /^OZ-\d{5}$/i,
    searchable: false
  },
  {
    key: 'venue',
    label: 'Venue',
    type: 'option',
    options: [
      { value: 'velvet-room', label: 'The Velvet Room' },
      { value: 'harbourside-hall', label: 'Harbourside Hall' },
      { value: 'swan-lane-social', label: 'Swan Lane Social' }
    ]
  },
  {
    key: 'city',
    label: 'City',
    type: 'option',
    options: [
      { value: 'melbourne', label: 'Melbourne' },
      { value: 'sydney', label: 'Sydney' },
      { value: 'perth', label: 'Perth' }
    ]
  },
  {
    key: 'genres',
    label: 'Genres',
    type: 'option',
    multiple: true,
    options: [
      { value: 'comedy', label: 'Comedy' },
      { value: 'jazz', label: 'Jazz' },
      { value: 'folk', label: 'Folk' }
    ]
  },
  {
    key: 'status',
    label: 'Status',
    type: 'option',
    status: {
      on_sale: { intent: 'success', order: 1 },
      selling_fast: { intent: 'warning', label: 'Selling fast', order: 2 },
      sold_out: { intent: 'danger', order: 3 }
    }
  },
  { key: 'capacity', label: 'Capacity', type: 'number' },
  { key: 'gross', label: 'Gross', type: 'money', currency: 'AUD' },
  {
    key: 'starts',
    label: 'Starts',
    type: 'date',
    moment: 'event',
    end: 'ends',
    timeZoneKey: 'zone',
    localDateKey: 'startsLocal',
    endLocalDateKey: 'endsLocal'
  },
  {
    key: 'onSale',
    label: 'On sale',
    type: 'date',
    moment: 'access',
    timeZoneKey: 'zone',
    localDateKey: 'onSaleLocal'
  },
  { key: 'created', label: 'Created', type: 'date', moment: 'timestamp' },
  { key: 'birthday', label: 'Birthday', type: 'date', moment: 'date' },
  { key: 'featured', label: 'Featured', type: 'boolean' },
  { key: 'notes', label: 'Notes', type: 'text', filterable: false }
]
