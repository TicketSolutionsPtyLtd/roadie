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
      { value: 'quilted-walrus-room', label: 'The Quilted Walrus Room' },
      { value: 'antler-kettle-hall', label: 'Antler Kettle Hall' },
      { value: 'drongo-bell-social-club', label: 'Drongo Bell Social Club' }
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

const SYDNEY = 'Australia/Sydney'
const PERTH = 'Australia/Perth'

export const eventRows = {
  // 7:30pm Saturday in Sydney.
  walrus: {
    id: 'walrus',
    name: 'Lampshade Disco',
    venue: 'quilted-walrus-room',
    city: 'sydney',
    genres: ['jazz', 'folk'],
    status: 'selling_fast',
    capacity: 400,
    gross: 12_500,
    starts: '2026-10-03T19:30:00+10:00',
    zone: SYDNEY,
    created: '2026-09-01T10:00:00Z',
    featured: true
  },
  // 11:30pm Saturday in Perth, already Sunday in Sydney.
  drongo: {
    id: 'drongo',
    name: 'Tuxedo Possum Cabaret',
    venue: 'drongo-bell-social-club',
    city: 'perth',
    genres: ['comedy'],
    status: 'on_sale',
    capacity: null,
    gross: 0,
    starts: '2026-10-03T23:30:00+08:00',
    zone: PERTH,
    created: 1_788_000_000_000,
    featured: false
  },
  // A festival running Thursday to Monday, across Sydney's DST change.
  festival: {
    id: 'festival',
    name: 'Ochre Kite Weekender',
    venue: 'antler-kettle-hall',
    city: 'sydney',
    genres: [],
    status: 'sold_out',
    capacity: 5000,
    starts: '2026-10-01T18:00:00+10:00',
    ends: '2026-10-05T23:00:00+11:00',
    zone: SYDNEY,
    created: new Date('2026-08-15T00:00:00Z')
  },
  // No venue yet, no capacity, no start.
  tba: {
    id: 'tba',
    name: 'Marzipan Thunderclap',
    venue: '',
    genres: null,
    status: 'on_sale',
    capacity: undefined,
    birthday: '1990-10-03'
  }
}
