import { BullIcon } from '../../../components/ui/icons'
import { cx } from '../../../components/ui/cx'

export type AvatarKind = 'me' | 'human' | 'bot'

const BG: Readonly<Record<AvatarKind, string>> = { me: '#F2C230', human: '#CFE3F5', bot: '#E9D7B4' }

function Scarecrow({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 19 L6 23 M12 19 V23 M16.5 19 L18 23 M9.5 19 L9 22.5 M14.5 19 L15 22.5" stroke="#D9AE52" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="13.5" r="6" fill="#E8C98A" stroke="#2E3B24" strokeWidth=".8" />
      <path d="M8.8 11.6 l1.8 1.8 M10.6 11.6 l-1.8 1.8 M13.4 11.6 l1.8 1.8 M15.2 11.6 l-1.8 1.8" stroke="#2E3B24" strokeWidth=".9" strokeLinecap="round" />
      <path d="M9.2 16.2 Q12 17.8 14.8 16.2" stroke="#2E3B24" strokeWidth=".8" fill="none" strokeLinecap="round" />
      <path d="M3.5 8.6 H20.5" stroke="#5E4129" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 8.6 L8.6 2.8 C10.5 2.2 13.5 2.2 15.4 2.8 L16.5 8.6Z" fill="#8E5B2E" stroke="#2E3B24" strokeWidth=".8" />
      <path d="M8.1 6.6 H15.9" stroke="#B5452F" strokeWidth="1.3" />
    </svg>
  )
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
      {kind === 'bot' ? <Scarecrow size={inner} /> : <BullIcon size={inner} />}
    </span>
  )
}
