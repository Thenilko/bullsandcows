import type { DuelFormat } from '@bc/protocol'
import type { Len } from '@bc/game-core'

export interface MatchSettings {
  len: Len
  zero: boolean
  format: DuelFormat
}

const DEFAULTS: MatchSettings = { len: 4, zero: false, format: 'race' }

export function parseSettings(params: URLSearchParams): MatchSettings {
  const len = Number(params.get('len'))
  const format = params.get('format')
  return {
    len: len === 3 || len === 4 || len === 5 ? len : DEFAULTS.len,
    zero: params.get('zero') === '1',
    format: format === 'classic' || format === 'race' ? format : DEFAULTS.format,
  }
}

export function settingsQuery(s: MatchSettings): string {
  return `len=${s.len}&zero=${s.zero ? 1 : 0}&format=${s.format}`
}
