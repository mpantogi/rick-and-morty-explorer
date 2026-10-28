const UNKNOWN_LABEL = 'Unknown'

export function displayValue(raw: string): string {
  return raw === '' || raw.toLowerCase() === 'unknown' ? UNKNOWN_LABEL : raw
}
