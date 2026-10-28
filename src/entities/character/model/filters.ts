import type { ApiFilterParams } from '../api/query-keys'
import { type CharacterFilters, GENDERS, STATUSES } from './types'

type FilterField = keyof CharacterFilters

// Real values are short (the longest name has 46 characters); the API fails on very long URLs.
export const FILTER_MAX_LENGTH = 100

export const FILTER_FIELDS = [
  'name',
  'status',
  'species',
  'type',
  'gender',
] as const satisfies readonly FilterField[]

export const EMPTY_FILTERS: Readonly<CharacterFilters> = {
  name: '',
  status: '',
  species: '',
  type: '',
  gender: '',
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, FILTER_MAX_LENGTH) : ''
}

// Partial enum values would match several options at the API (`status=a` hits Alive and Dead).
function toOption<T extends string>(value: unknown, options: readonly T[]): T | '' {
  const text = toText(value).toLowerCase()
  return options.find((option) => option === text) ?? ''
}

export function normalizeFilters(input: Partial<Record<FilterField, unknown>>): CharacterFilters {
  return {
    name: toText(input.name),
    status: toOption(input.status, STATUSES),
    species: toText(input.species),
    type: toText(input.type),
    gender: toOption(input.gender, GENDERS),
  }
}

export function toApiParams(filters: CharacterFilters): ApiFilterParams {
  const params: Partial<Record<FilterField, string>> = {}
  for (const field of FILTER_FIELDS) {
    const value = filters[field].trim().toLowerCase()
    if (value !== '') params[field] = value
  }
  return params
}

function matchesField(field: FilterField, value: string, filter: string): boolean {
  const needle = filter.trim().toLowerCase()
  if (needle === '') return true
  const haystack = value.toLowerCase()
  // The API anchors values starting with "male", so Male never matches Female.
  if (field === 'gender' && needle.startsWith('male')) return haystack.startsWith(needle)
  return haystack.includes(needle)
}

// Mirrors the API's filter semantics, so local heroes filter exactly like API characters.
export function matchesFilters(
  subject: Readonly<Record<FilterField, string>>,
  filters: Readonly<Record<FilterField, string>>,
): boolean {
  return FILTER_FIELDS.every((field) => matchesField(field, subject[field], filters[field]))
}

export function countActiveFilters(filters: CharacterFilters): number {
  return FILTER_FIELDS.filter((field) => filters[field].trim() !== '').length
}
