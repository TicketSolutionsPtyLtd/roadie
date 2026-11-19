/** What the calendar places records by, and what each record's chip shows. */
export type CalendarLayoutConfig<Row extends object = Record<string, unknown>> =
  {
    /** The date field that places each record, until a view picks another. A range covers each of its days. */
    dateField: keyof Row & string
    /** The field each chip shows, which carries the record's link. */
    title: keyof Row & string
    /** The month shown first, as any ISO date in it. Defaults to this month, once the browser's clock is read. */
    defaultMonth?: string
    /** First day of the week: 1 is Monday and 7 is Sunday. @default 1 */
    weekStart?: number
    /** Names the months and days. @default 'en-AU' */
    locale?: string
  }
