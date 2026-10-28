import type { CharacterGender, CharacterStatus } from './types'

const UNKNOWN_LABEL = 'Unknown'

const STATUS_LABELS = {
  alive: 'Alive',
  dead: 'Dead',
  unknown: UNKNOWN_LABEL,
} as const satisfies Record<CharacterStatus, string>

const GENDER_LABELS = {
  female: 'Female',
  male: 'Male',
  genderless: 'Genderless',
  unknown: UNKNOWN_LABEL,
} as const satisfies Record<CharacterGender, string>

export function statusLabel(status: CharacterStatus): string {
  return STATUS_LABELS[status]
}

export function genderLabel(gender: CharacterGender): string {
  return GENDER_LABELS[gender]
}

export function displayValue(raw: string): string {
  return raw === '' || raw.toLowerCase() === 'unknown' ? UNKNOWN_LABEL : raw
}
