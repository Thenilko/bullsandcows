import { CowHeadPaths } from '../ui/characters'
import { COW_BODY, ForeLeg, HindLeg, RIG_LINE, RigTail } from './RigParts'

const BODY = '#FFFDF6'
const FAR = '#E9E2D6'
const HOOF = '#3A2A20'
const SPOT = '#26262B'

/** Cow rig (PasScene `rig-c`); the spots use the `rigCowClip` clip path that `Defs` defines once. */
export function Cow() {
  return (
    <g className="rig rig-c" transform="scale(.5)">
      <ellipse className="rig-shadow" cx="90" cy="106" rx="54" ry="5" fill="#1E2A14" opacity=".2" />
      <g className="rig-body">
        <HindLeg name="fh" far x={102} fill={FAR} hoof={HOOF} />
        <ForeLeg name="ff" far x={60} fill={FAR} hoof={HOOF} />
        <RigTail color={BODY} />
        <path d={COW_BODY} fill={BODY} />
        <g clipPath="url(#rigCowClip)" fill={SPOT}>
          <path d="M70 28 C84 26 96 34 94 46 C92 56 78 58 70 52 C62 46 62 34 70 28Z" />
          <path d="M110 28 C124 26 142 34 146 48 C140 56 126 56 118 48 C112 42 106 34 110 28Z" />
          <path d="M86 66 C94 62 104 66 104 74 C100 80 88 80 84 74Z" />
        </g>
        <path d={COW_BODY} fill="none" {...RIG_LINE} strokeLinejoin="round" />
        <g className="rig-udder">
          <ellipse cx="110" cy="79" rx="10" ry="6" fill="#F4B9B2" stroke="#2E3B24" strokeWidth="2.6" />
          <path d="M104 84 v3.5 M110 85 v4 M116 84 v3.5" stroke="#2E3B24" strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <HindLeg name="nh" x={110} fill={BODY} hoof={HOOF} />
        <ForeLeg name="nf" x={50} fill={BODY} hoof={HOOF} />
        <g className="rig-head">
          <g transform="translate(32 40) scale(.58)">
            <CowHeadPaths strokeWidth={6} />
          </g>
        </g>
      </g>
    </g>
  )
}
