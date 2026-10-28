import type { ApiEpisode } from '../api/schemas'
import { parseAirDate } from './air-date'
import type { EpisodeView } from './types'

export function toEpisodeView(episode: ApiEpisode): EpisodeView {
  return {
    id: episode.id,
    name: episode.name,
    code: episode.episode,
    airDate: episode.air_date,
    airDateIso: parseAirDate(episode.air_date),
  }
}
