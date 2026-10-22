/**
 * Shared pieces of the bull and cow rigs (PasScene `rig-b` / `rig-c`): flat colours, #2E3B24 outline 3.4.
 * The class names are the CSS animation API (`.leg.nf|ff|nh|fh > .low`, `.rig-tail`); the legs carry no
 * `transform` attribute because the CSS `transform` animations would replace it.
 */
export const RIG_LINE = { stroke: '#2E3B24', strokeWidth: 3.4 } as const

/** Cow body outline; also the `rigCowClip` clip path that keeps the spots inside the body. */
export const COW_BODY =
  'M44 48 C46 36 58 31 74 31 C94 32 112 31 126 33 C140 35 146 46 144 58 C142 70 134 76 122 77 C102 80 78 80 60 78 C48 76 42 68 42 58 Z'

const TAIL = 'M142 46 C152 52 155 66 152 82'

type LegName = 'nf' | 'ff' | 'nh' | 'fh'

interface LegProps {
  name: LegName
  /** Left edge of the leg in the 160×112 rig box. */
  x: number
  fill: string
  hoof: string
  far?: boolean
}

interface LowProps {
  x: number
  fill: string
  hoof: string
}

/** Lower leg and hoof, rotated at the knee by the gallop/walk keyframes. */
function Low({ x, fill, hoof }: LowProps) {
  return (
    <g className="low">
      <rect x={x + 1.5} y="84" width="12" height="18" rx="4" fill={fill} {...RIG_LINE} />
      <rect x={x} y="99" width="15" height="7" rx="2.5" fill={hoof} {...RIG_LINE} />
    </g>
  )
}

function legClass(name: LegName, far: boolean | undefined): string {
  return far ? `leg ${name} far` : `leg ${name}`
}

export function HindLeg({ name, x, fill, hoof, far }: LegProps) {
  const d = `M${x} 50 C${x + 8} 44 ${x + 24} 46 ${x + 26} 58 L${x + 22} 88 L${x + 8} 88 C${x + 6} 76 ${x} 66 ${x} 50Z`
  return (
    <g className={legClass(name, far)}>
      <path d={d} fill={fill} {...RIG_LINE} strokeLinejoin="round" />
      <Low x={x + 7.5} fill={fill} hoof={hoof} />
    </g>
  )
}

export function ForeLeg({ name, x, fill, hoof, far }: LegProps) {
  return (
    <g className={legClass(name, far)}>
      <rect x={x} y="58" width="15" height="30" rx="6" fill={fill} {...RIG_LINE} />
      <Low x={x} fill={fill} hoof={hoof} />
    </g>
  )
}

export function RigTail({ color }: { color: string }) {
  return (
    <g className="rig-tail">
      <path d={TAIL} stroke="#2E3B24" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d={TAIL} stroke={color} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M148 80 C146 88 150 95 155 93 C159 89 157 82 152 79Z" fill="#26262B" stroke="#2E3B24" strokeWidth="2.2" />
    </g>
  )
}
