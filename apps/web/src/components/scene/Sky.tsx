/** Sky, dawn and sun of the mobile drawing; the clouds and birds move in SkyLayer, over the svg. */
interface SkyProps {
  dawn: number
  sunY: number
  reduced: boolean
}

export function Sky({ dawn, sunY, reduced }: SkyProps) {
  return (
    <>
      <rect width="390" height="272" fill="url(#psSky)" />
      <rect data-layer="dawn" className="ps-fade" width="390" height="272" fill="url(#psDawn)" style={{ opacity: dawn }} />
      <g data-layer="sun" className="ps-sun" style={{ transform: `translate(322px, ${sunY}px)` }}>
        <circle r="60" fill="url(#psGlow)" />
        <circle className={reduced ? undefined : 'ps-rays'} r="34" fill="none" stroke="#FFF1B8" strokeWidth="22" strokeDasharray="4 10" opacity=".35" />
        <circle r="17" fill="#FFF3C4" />
      </g>
    </>
  )
}
