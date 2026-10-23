import { COW_BODY } from './RigParts'

/** Gradients of the pasture scenes (no filters, the fog is FogLayer); `rigCowClip` (the cow rigs' spot clip) is defined only here. */
export function Defs() {
  return (
    <>
<defs>
<linearGradient id="psSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5FA8DD" /><stop offset=".55" stopColor="#A9D6F0" /><stop offset="1" stopColor="#EAF4E8" /></linearGradient>
<linearGradient id="psDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2A88A" /><stop offset="1" stopColor="#F7D6AA" stopOpacity="0" /></linearGradient>
<radialGradient id="psGlow"><stop offset="0" stopColor="#FFF8DA" /><stop offset=".35" stopColor="#FFE79A" stopOpacity=".8" /><stop offset="1" stopColor="#FFE28C" stopOpacity="0" /></radialGradient>
<radialGradient id="psDust"><stop offset="0" stopColor="#E9D6AE" /><stop offset="1" stopColor="#E9D6AE" stopOpacity="0" /></radialGradient>
<linearGradient id="psMtnA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9DB6CC" /><stop offset="1" stopColor="#C9DBE5" /></linearGradient>
<linearGradient id="psMtnB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7F9DB6" /><stop offset="1" stopColor="#AFC7D4" /></linearGradient>
<linearGradient id="psHillFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#A9D18B" /><stop offset="1" stopColor="#84B96A" /></linearGradient>
<linearGradient id="psHillMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8DC66C" /><stop offset="1" stopColor="#5E9E46" /></linearGradient>
<linearGradient id="psGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7DBE59" /><stop offset="1" stopColor="#4C8E36" /></linearGradient>
<linearGradient id="psBarn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#C9563D" /><stop offset="1" stopColor="#9C3A28" /></linearGradient>
<linearGradient id="psWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B98650" /><stop offset="1" stopColor="#875B33" /></linearGradient>
<radialGradient id="psCanopy" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#86C462" /><stop offset=".6" stopColor="#4F8F3E" /><stop offset="1" stopColor="#346829" /></radialGradient>
<clipPath id="rigCowClip"><path d={COW_BODY} /></clipPath>
</defs>
    </>
  )
}
