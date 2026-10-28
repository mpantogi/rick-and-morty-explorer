const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const
const AIR_DATE = /^([A-Z][a-z]+) (\d{1,2}), ([1-9]\d{3})$/
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length

function monthIndex(name: string): number {
  return MONTHS.findIndex((month) => month === name)
}

// Parsed by hand: `new Date('December 2, 2013')` reads local time and the format is not standard.
export function parseAirDate(airDate: string): string | null {
  const [, monthName = '', day = '', year = ''] = AIR_DATE.exec(airDate) ?? []
  const month = monthIndex(monthName)
  if (month < 0) return null
  const date = new Date(Date.UTC(Number(year), month, Number(day)))
  // Date.UTC rolls February 30 over into March, so a changed day means it never existed.
  if (date.getUTCDate() !== Number(day)) return null
  return date.toISOString().slice(0, ISO_DATE_LENGTH)
}
