import type { AvatarSpecies, RankKey } from '@bc/protocol'
import { ScarecrowIcon } from '../../../components/ui/icons'
import { RankAvatar } from '../../../components/ui/RankAvatar'
import { cx } from '../../../components/ui/cx'
import { GUEST_RANK } from '../../../lib/rank'

export type AvatarKind = 'me' | 'human' | 'bot'

const BOT_BG = '#E9D7B4'

export interface AvatarProps {
  kind: AvatarKind
  size: number
  /** Title of the player (ring colour and accessory); the calf when unknown. Ignored for the bot. */
  rankKey?: RankKey
  /** The player's chosen character; without one you are the bull and a human opponent the cow. */
  species?: AvatarSpecies
  thinking?: boolean
}

/** PasDuel: the bot is always the scarecrow; people are drawn as the character they chose. */
export function Avatar({ kind, size, rankKey = GUEST_RANK, species, thinking = false }: AvatarProps) {
  if (kind === 'bot') {
    const inner = Math.round(size * 0.72)
    return (
      <span className={cx('av', thinking && 'think')} style={{ width: size, height: size, background: BOT_BG }}>
        <ScarecrowIcon size={inner} />
      </span>
    )
  }
  const drawn = species ?? (kind === 'me' ? 'bull' : 'cow')
  return <RankAvatar species={drawn} rankKey={rankKey} size={size} thinking={thinking} />
}
