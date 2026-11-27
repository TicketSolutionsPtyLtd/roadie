import { Calendar } from '.'

// Six weeks, so the month the client fills in has the server's rows.
export const NoToday = () => (
  <Calendar selected={null} onSelect={() => {}} fixedWeeks />
)
