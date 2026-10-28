export interface EpisodeView {
  readonly id: number
  readonly name: string
  readonly code: string
  readonly airDate: string
  // null when the API's air date is not a "Month D, YYYY" date
  readonly airDateIso: string | null
}
