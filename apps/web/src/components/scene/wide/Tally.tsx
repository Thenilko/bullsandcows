export interface Tally {
  /** Bulls of the last guess. */
  readonly b: number
  /** Cows of the last guess. */
  readonly c: number
}

interface TallyProps {
  tally: Tally
  /** The sign group is re-keyed by this flag so the swing (`pw-sign`) restarts on every attempt. */
  parity: boolean
}

type Head = 'bull' | 'cow' | 'none'

const STEP = 22
const HEAD_Y = -21
const MAX_HEADS = 5

function clampCount(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(MAX_HEADS, Math.floor(n))) : 0
}

/** b bull heads then c cow heads; an X when there is nothing to show. */
export function tallyHeads({ b, c }: Tally): readonly Head[] {
  const heads: Head[] = [...Array<Head>(clampCount(b)).fill('bull'), ...Array<Head>(clampCount(c)).fill('cow')]
  return heads.length ? heads : ['none']
}

function HeadShape({ head }: { head: Head }) {
  switch (head) {
    case 'bull':
      return (
        <>
          <path d="M-6 -4 C-11 -5 -14 -9 -14 -13 C-11 -10 -8 -9 -4 -9Z M6 -4 C11 -5 14 -9 14 -13 C11 -10 8 -9 4 -9Z" fill="#F3E6C8" stroke="#2E3B24" strokeWidth="1.4" />
          <circle r="9" fill="#5E3E2C" stroke="#2E3B24" strokeWidth="1.6" />
          <ellipse cy="4" rx="6" ry="4" fill="#A07B64" />
        </>
      )
    case 'cow':
      return (
        <>
          <circle r="9" fill="#FFFDF6" stroke="#2E3B24" strokeWidth="1.6" />
          <path d="M1 -8.5 C6 -8 9 -4 8 1 C5 2 2 -1 1 -8.5Z" fill="#26262B" />
          <ellipse cy="4" rx="6" ry="4" fill="#F4B9B2" />
        </>
      )
    case 'none':
      return <path d="M-8 -8 L8 8 M8 -8 L-8 8" stroke="#6A4426" strokeWidth="3.4" strokeLinecap="round" />
  }
}

/** The wooden tally sign in front of the pen: the last guess as small bull and cow heads. */
export function TallySign({ tally, parity }: TallyProps) {
  const heads = tallyHeads(tally)
  const x0 = -((heads.length - 1) * STEP) / 2
  return (
    <g data-layer="tally" transform="translate(866 640)">
      <rect x="-4" y="0" width="8" height="70" fill="#7A5230" />
      <g key={parity ? 'A' : 'B'} className="pw-sign">
        <rect x="-58" y="-46" width="116" height="50" rx="8" fill="#C48E55" stroke="#6A4426" strokeWidth="4" />
        <path d="M-50 -30 H40 M-40 -12 H50" stroke="#A8743F" strokeWidth="2" strokeLinecap="round" />
        {heads.map((head, i) => (
          <g key={i} data-tally={head} transform={`translate(${x0 + i * STEP} ${HEAD_Y})`}>
            <HeadShape head={head} />
          </g>
        ))}
      </g>
    </g>
  )
}
