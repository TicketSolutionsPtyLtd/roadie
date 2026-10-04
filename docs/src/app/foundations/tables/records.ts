import type { RecordTableNarrow } from '@oztix/roadie-components/record-table'
import type { ValueFormat } from '@oztix/roadie-core/dataviz'
import type { RecordFieldType } from '@oztix/roadie-core/records'

export type ReferenceColumn = {
  label: string
  type: RecordFieldType
  /** How the cell reads: a format, a Badge, monospace, a date style. */
  shows: string
  format?: ValueFormat
  pin?: boolean
  /** Where the column shows on a phone. Left out, it is hidden there. */
  narrow?: Exclude<RecordTableNarrow, 'hidden'>
  /** Hides first as the table narrows, 3 before 2 before 1. */
  priority?: 1 | 2 | 3
}

/** A complete Pane example on the RecordTable page, by heading anchor. */
export type PaneExample = { anchor: string; label: string }

export type OztixRecord = {
  name: string
  what: string
  columns: ReferenceColumn[]
  pane: string
  example?: PaneExample
  /** How the records read under 40rem, as list rows or cards. */
  phone: string
  dashboard: string
  detail: string
  print: string
}

export const OZTIX_RECORDS: readonly OztixRecord[] = [
  {
    name: 'Event',
    what: 'A show or session at a venue. The record most panes start from.',
    columns: [
      {
        label: 'Event',
        type: 'text',
        shows: 'Strong text',
        pin: true,
        narrow: 'title'
      },
      {
        label: 'Venue',
        type: 'option',
        shows: 'Option label',
        narrow: 'description'
      },
      { label: 'Status', type: 'option', shows: 'Badge', narrow: 'trailing' },
      {
        label: 'Starts',
        type: 'date',
        shows:
          'Long date and time in the venue’s zone (Fri 27 Nov 2026, 7:30pm)',
        narrow: 'detail'
      },
      { label: 'Sold', type: 'number', shows: 'Number', narrow: 'detail' },
      { label: 'Capacity', type: 'number', shows: 'Number', priority: 2 },
      {
        label: 'Gross',
        type: 'money',
        shows: 'Compact currency',
        format: 'compactCurrency',
        narrow: 'detail'
      }
    ],
    phone:
      'Cards: the event, the venue under it and the status on the end, with starts, sold and gross as details.',
    pane: 'Search by event or venue. Sort by start date, soonest first.',
    example: { anchor: 'in-a-pane', label: 'Events pane' },
    dashboard:
      'Top events: Event with the venue as secondary text, a sell-through meter and Gross. Sort by gross, largest first. Five rows.',
    detail:
      'The event page leads with image, date and venue, then stat tiles for sold, gross and sell-through. Ticket types sit in a DataTable.',
    print:
      'An event report: the ticket type DataTable, plain, and charts drawn with renderChartSvg.'
  },
  {
    name: 'Order',
    what: 'One purchase by one customer, holding one or more tickets.',
    columns: [
      {
        label: 'Order',
        type: 'text',
        shows: 'Monospace order number',
        pin: true,
        narrow: 'title'
      },
      { label: 'Customer', type: 'text', shows: 'Text', narrow: 'description' },
      { label: 'Event', type: 'option', shows: 'Option label', priority: 2 },
      { label: 'Status', type: 'option', shows: 'Badge', narrow: 'trailing' },
      {
        label: 'Placed',
        type: 'date',
        shows: 'Timestamp in the reader’s zone (27 Nov 2026, 2:14pm)',
        priority: 3
      },
      {
        label: 'Total',
        type: 'money',
        shows: 'Currency',
        format: 'currency'
      }
    ],
    phone:
      'List rows: the order number, the customer under it and the status on the end.',
    pane: 'Search by order number or customer. Newest first.',
    dashboard:
      'Not as a list. Show the order count in a StatTile and link to the Orders pane.',
    detail:
      'Order number and status, the customer, the event, then line items in a DataTable: ticket type, quantity, price and subtotal.',
    print:
      'A tax invoice: the line items DataTable, plain, with totals in currency.'
  },
  {
    name: 'Attendee',
    what: 'One ticket and the person holding it. One order can hold several.',
    columns: [
      {
        label: 'Name',
        type: 'text',
        shows: 'Strong text',
        pin: true,
        narrow: 'title'
      },
      { label: 'Email', type: 'text', shows: 'Text', priority: 2 },
      { label: 'Check-in', type: 'option', shows: 'Badge', narrow: 'trailing' },
      {
        label: 'Ticket type',
        type: 'option',
        shows: 'Option label',
        narrow: 'description'
      },
      {
        label: 'Order',
        type: 'text',
        shows: 'Monospace order number',
        priority: 3
      },
      {
        label: 'Checked in at',
        type: 'date',
        shows: 'Timestamp in the reader’s zone',
        priority: 3
      }
    ],
    phone:
      'List rows at the door: the name, the ticket type under it and check-in on the end.',
    pane: 'Search by name or email. Sort by name.',
    dashboard:
      'Entry by gate: Gate, Checked in, and Inside as a meter of the share now in the venue. One row per gate.',
    detail:
      'The ticket: holder, ticket type, barcode and scan history, with transfer and resend actions.',
    print:
      'A door list PDF: a plain DataTable per ticket type, sorted by surname. Render it on the server.'
  },
  {
    name: 'Customer',
    what: 'A person who has bought from a client, with their contact details and history.',
    columns: [
      {
        label: 'Name',
        type: 'text',
        shows: 'Strong text',
        pin: true,
        narrow: 'title'
      },
      { label: 'Email', type: 'text', shows: 'Text', narrow: 'description' },
      { label: 'Suburb', type: 'text', shows: 'Text, searchable', priority: 3 },
      { label: 'State', type: 'option', shows: 'Option label', priority: 2 },
      { label: 'Orders', type: 'number', shows: 'Number' },
      {
        label: 'Spend',
        type: 'money',
        shows: 'Currency',
        format: 'currency',
        narrow: 'trailing'
      },
      {
        label: 'Last order',
        type: 'date',
        shows: 'Date and time in the reader’s zone (27 Nov 2026, 2:14pm)',
        priority: 3
      },
      { label: 'Marketing', type: 'boolean', shows: 'Yes or No' }
    ],
    phone: 'List rows: the name, the email under it and spend on the end.',
    pane: 'Search by name, email or suburb.',
    dashboard:
      'Aggregate, never list people. Where buyers are from: Suburb and share, five rows. New and returning buyers as StatTiles.',
    detail: 'Contact details and marketing consent, then their orders.',
    print: 'Leave personal details out of reports.'
  },
  {
    name: 'Ticket type',
    what: 'A price and allocation on sale for one event, like General admission or VIP.',
    columns: [
      {
        label: 'Ticket type',
        type: 'text',
        shows: 'Strong text',
        pin: true,
        narrow: 'title'
      },
      {
        label: 'Price',
        type: 'money',
        shows: 'Currency',
        format: 'currency',
        narrow: 'description'
      },
      { label: 'Status', type: 'option', shows: 'Badge', narrow: 'trailing' },
      { label: 'Sold', type: 'number', shows: 'Number' },
      { label: 'Allocation', type: 'number', shows: 'Number', priority: 3 },
      {
        label: 'Gross',
        type: 'money',
        shows: 'Compact currency',
        format: 'compactCurrency'
      }
    ],
    phone:
      'List rows: the ticket type, the price under it and the status on the end.',
    pane: 'Inside the event. Most events have fewer than ten, so a DataTable often does the job.',
    dashboard:
      'Ticket type mix: Ticket type, Sold, a sell-through meter and Gross. Sort by sold, largest first.',
    detail:
      'The event page shows them in a DataTable: Ticket type, Price, Sold and Gross.',
    print:
      'The settlement report lists them in a plain DataTable: Ticket type, Price, Sold and Gross.'
  },
  {
    name: 'Payout',
    what: 'A payment to a client for one settlement period, covering one or more events.',
    columns: [
      {
        label: 'Reference',
        type: 'text',
        shows: 'Monospace reference, searchable',
        pin: true,
        narrow: 'title'
      },
      {
        label: 'Period',
        type: 'date',
        shows: 'Date range (Sun 1 to Sun 15 Nov 2026)',
        narrow: 'description'
      },
      { label: 'Status', type: 'option', shows: 'Badge', narrow: 'trailing' },
      {
        label: 'Paid',
        type: 'date',
        shows: 'Date and time in the reader’s zone (27 Nov 2026, 2:14pm)',
        priority: 2
      },
      {
        label: 'Gross',
        type: 'money',
        shows: 'Currency',
        format: 'currency'
      },
      {
        label: 'Fees',
        type: 'money',
        shows: 'Currency',
        format: 'currency',
        priority: 3
      },
      { label: 'Net', type: 'money', shows: 'Currency', format: 'currency' }
    ],
    phone:
      'List rows: the reference, the period under it and the status on the end.',
    pane: 'Newest period first. Search by reference.',
    dashboard:
      'The next payout as a StatTile, with its period and date as context. Recent payouts: Period, Paid and Net, three rows.',
    detail:
      'A statement headed by its period: gross, booking fees, refunds, card fees and net as a plain DataTable.',
    print: 'The settlement statement PDF uses the same DataTable.'
  },
  {
    name: 'Refund',
    what: 'Money returned against an order, whole or in part.',
    columns: [
      {
        label: 'Order',
        type: 'text',
        shows: 'Monospace order number',
        pin: true,
        narrow: 'title'
      },
      { label: 'Customer', type: 'text', shows: 'Text', narrow: 'description' },
      {
        label: 'Amount',
        type: 'money',
        shows: 'Currency',
        format: 'currency'
      },
      { label: 'Status', type: 'option', shows: 'Badge', narrow: 'trailing' },
      { label: 'Reason', type: 'option', shows: 'Option label', priority: 3 },
      {
        label: 'Requested',
        type: 'date',
        shows: 'Timestamp in the reader’s zone',
        priority: 2
      }
    ],
    phone:
      'List rows: the order number, the customer under it and the status on the end.',
    pane: 'A queue, oldest first. Search by order number or customer.',
    dashboard:
      'Pending refunds as a StatTile. Refunds by reason: Reason, Count and Amount, five rows.',
    detail:
      'Shown on the order it belongs to, as a line in its history with the amount and reason.',
    print:
      'Finance reconciles refunds from their lines in the settlement statement.'
  },
  {
    name: 'Promo code',
    what: 'A code that discounts tickets, with a usage limit and a date range.',
    columns: [
      {
        label: 'Code',
        type: 'text',
        shows: 'Monospace code',
        pin: true,
        narrow: 'title'
      },
      {
        label: 'Discount',
        type: 'text',
        shows: 'Text (20% or $10)',
        narrow: 'description'
      },
      { label: 'Status', type: 'option', shows: 'Badge', narrow: 'trailing' },
      { label: 'Uses', type: 'number', shows: 'Number' },
      { label: 'Limit', type: 'number', shows: 'Number', priority: 3 },
      {
        label: 'Revenue',
        type: 'money',
        shows: 'Compact currency',
        format: 'compactCurrency'
      },
      {
        label: 'Ends',
        type: 'date',
        shows: 'Long date (Fri 27 Nov 2026)',
        priority: 2
      }
    ],
    phone:
      'List rows: the code, the discount under it and the status on the end.',
    pane: 'Search by code.',
    dashboard:
      'Top promo codes: Code, Uses and Revenue. Sort by revenue, largest first. Five rows.',
    detail: 'The code settings as a form, then the orders that used it.',
    print: 'In a marketing report, the same three columns as a plain DataTable.'
  }
]
