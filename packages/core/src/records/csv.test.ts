import { describe, expect, it } from 'vitest'

import { recordFields } from './builder'
import { type RecordsToCsvOptions, recordsToCsv } from './csv'

type Attendee = {
  id: string
  name: string
  ticket: string
  paid: number | null
  scans: number | null
  note: string | null
  vip?: boolean
  scanned?: string
}

const field = recordFields<Attendee>()
const fields = [
  field.text('name', { label: 'Name' }),
  field.option('ticket', {
    label: 'Ticket type',
    options: [
      { value: 'ga', label: 'General admission' },
      { value: 'vip', label: 'VIP' }
    ]
  }),
  field.money('paid', { label: 'Paid' }),
  field.number('scans', { label: 'Scans' }),
  field.text('note', { label: 'Note' })
]

const attendees: Attendee[] = [
  {
    id: 'a',
    name: 'Mia Tran',
    ticket: 'ga',
    paid: 89.5,
    scans: 1200,
    note: 'Said "hi", twice'
  },
  {
    id: 'b',
    name: 'Jack Ellis',
    ticket: 'vip',
    paid: null,
    scans: null,
    note: 'Line one\nline two'
  },
  { id: 'c', name: 'Ava Nguyen', ticket: 'ga', paid: 45, scans: 3, note: null }
]

const ZONE = { timeZone: 'Australia/Sydney' }
const lines = (csv: string) => csv.split('\r\n')
const csvOf = (
  rows: readonly object[],
  options: Partial<RecordsToCsvOptions> = {}
) => recordsToCsv(rows, fields, { ...ZONE, ...options })

describe('recordsToCsv', () => {
  it('writes a header row and quotes commas, quotes and newlines', () => {
    expect(csvOf(attendees)).toBe(
      [
        'Name,Ticket type,Paid,Scans,Note',
        'Mia Tran,General admission,$89.50,"1,200","Said ""hi"", twice"',
        'Jack Ellis,VIP,,,"Line one\nline two"',
        'Ava Nguyen,General admission,$45,3,'
      ].join('\r\n')
    )
  })

  it('writes the fields given, in their order', () => {
    const csv = recordsToCsv(attendees, [fields[4]!, fields[0]!], ZONE)
    expect(lines(csv)[0]).toBe('Note,Name')
  })

  it('writes only a header with no rows', () => {
    expect(csvOf([])).toBe('Name,Ticket type,Paid,Scans,Note')
  })

  it('writes the rows in the order given', () => {
    const csv = csvOf([attendees[2]!, attendees[0]!])
    expect(lines(csv).map((line) => line.split(',')[0])).toEqual([
      'Name',
      'Ava Nguyen',
      'Mia Tran'
    ])
  })

  it.each([
    ['=1+1', "'=1+1"],
    ['+61 400 000 000', "'+61 400 000 000"],
    ['-x', "'-x"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['\tcmd', "'\tcmd"],
    ['\rcmd', '"\'\rcmd"']
  ])('neutralises a formula-like %j', (text, expected) => {
    const [, row] = lines(csvOf([{ ...attendees[2]!, name: text }]))
    expect(row!.split(',')[0]).toBe(expected)
  })

  it('neutralises a formula-like header', () => {
    const csv = recordsToCsv(
      [],
      [{ key: 'name', label: '=Name', type: 'text' }],
      ZONE
    )
    expect(csv).toBe("'=Name")
  })

  it('quotes leading and trailing whitespace', () => {
    const [, row] = lines(csvOf([{ ...attendees[2]!, name: ' padded ' }]))
    expect(row!.startsWith('" padded ",')).toBe(true)
  })

  it('leaves formatted negatives alone', () => {
    const [, row] = lines(csvOf([{ ...attendees[2]!, paid: -20 }]))
    expect(row).toBe('Ava Nguyen,General admission,-$20,3,')
  })

  it('writes raw values: plain numbers, labels and text, still neutralised', () => {
    const csv = csvOf(
      [
        { ...attendees[0]!, name: '=cmd', paid: -1234.5 },
        { ...attendees[1]!, scans: Number.NaN }
      ],
      { values: 'raw' }
    )
    expect(lines(csv).slice(1)).toEqual([
      '\'=cmd,General admission,-1234.5,1200,"Said ""hi"", twice"',
      'Jack Ellis,VIP,,,"Line one\nline two"'
    ])
  })

  it('writes status labels, and keeps their keys out of raw values', () => {
    const status = [
      {
        key: 'status',
        label: 'Status',
        type: 'option' as const,
        status: {
          paid: { intent: 'success' as const, label: 'Paid in full' },
          on_hold: { intent: 'warning' as const }
        }
      }
    ]
    const rows = [{ status: 'paid' }, { status: 'on_hold' }, { status: '=cmd' }]
    for (const values of ['formatted', 'raw'] as const)
      expect(lines(recordsToCsv(rows, status, { ...ZONE, values }))).toEqual([
        'Status',
        'Paid in full',
        'On hold',
        "'=cmd"
      ])
  })

  it('writes booleans and dates as the table reads them', () => {
    const more = recordFields<Attendee>()
    const csv = recordsToCsv(
      [{ ...attendees[0]!, vip: true, scanned: '2026-11-06' }],
      [
        more.boolean('vip', { label: 'VIP' }),
        more.date('scanned', { label: 'Scanned', moment: 'date' })
      ],
      ZONE
    )
    expect(lines(csv)[1]).toBe('Yes,Fri 6 Nov 2026')
  })

  it.each(['formatted', 'raw'] as const)(
    'writes non-finite figures as empty and negative zero as zero (%s)',
    (values) => {
      const csv = csvOf(
        [
          { ...attendees[2]!, paid: -0, scans: Number.POSITIVE_INFINITY },
          { ...attendees[2]!, paid: Number.NaN, scans: -0 }
        ],
        { values }
      )
      const zero = values === 'raw' ? '0' : '$0'
      expect(lines(csv).slice(1)).toEqual([
        `Ava Nguyen,General admission,${zero},,`,
        'Ava Nguyen,General admission,,0,'
      ])
    }
  )
})
