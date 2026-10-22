import { BullHeadPaths } from '../ui/characters'
import { ForeLeg, HindLeg, RIG_LINE, RigTail } from './RigParts'

const BODY = '#5E3E2C'
const FAR = '#4A3427'
const HOOF = '#2E1E16'

/** Bull rig (PasScene `rig-b`): a 160×112 drawing scaled to the 80×56 animal box of `sceneAnimals`. */
export function Bull() {
  return (
    <g className="rig rig-b" transform="scale(.5)">
      <ellipse className="rig-shadow" cx="90" cy="106" rx="56" ry="5" fill="#1E2A14" opacity=".22" />
      <g className="rig-dust">
        <circle cx="134" cy="102" r="7" fill="#E9D6AE" />
        <circle cx="148" cy="98" r="5" fill="#E9D6AE" />
        <circle cx="122" cy="104" r="5" fill="#E9D6AE" />
      </g>
      <g className="rig-body">
        <HindLeg name="fh" far x={102} fill={FAR} hoof={HOOF} />
        <ForeLeg name="ff" far x={60} fill={FAR} hoof={HOOF} />
        <RigTail color={BODY} />
        <path
          d="M44 46 C46 31 60 24 76 26 C96 28 116 28 128 32 C142 36 147 48 145 60 C143 72 134 78 120 79 C100 81 76 81 60 79 C48 77 42 68 42 58 Z"
          fill={BODY}
          {...RIG_LINE}
          strokeLinejoin="round"
        />
        <path d="M60 31 C74 27 92 29 104 31" stroke="#7A5440" strokeWidth="5" fill="none" strokeLinecap="round" />
        <HindLeg name="nh" x={110} fill={BODY} hoof={HOOF} />
        <ForeLeg name="nf" x={50} fill={BODY} hoof={HOOF} />
        <g className="rig-head">
          <g transform="translate(32 39) scale(.58)">
            <BullHeadPaths strokeWidth={6} />
          </g>
        </g>
      </g>
    </g>
  )
}
