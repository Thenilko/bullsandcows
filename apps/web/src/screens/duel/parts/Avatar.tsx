import { BullIcon, CowIcon, ScarecrowIcon } from '../../../components/ui/icons'
import { cx } from '../../../components/ui/cx'

export type AvatarKind = 'me' | 'human' | 'bot'

const BG: Readonly<Record<AvatarKind, string>> = { me: '#F2C230', human: '#CFE3F5', bot: '#E9D7B4' }

/** PasDuel: you are the bull, a human opponent is the cow, the bot is the scarecrow. */
function Face({ kind, size }: { kind: AvatarKind; size: number }) {
  if (kind === 'bot') return <ScarecrowIcon size={size} />
  if (kind === 'human') return <CowIcon size={size} />
  return <BullIcon size={size} />
}

export interface AvatarProps {
  kind: AvatarKind
  size: number
  thinking?: boolean
}

export function Avatar({ kind, size, thinking = false }: AvatarProps) {
  const inner = Math.round(size * 0.72)
  return (
    <span className={cx('av', thinking && 'think')} style={{ width: size, height: size, background: BG[kind] }}>
      <Face kind={kind} size={inner} />
    </span>
  )
}
