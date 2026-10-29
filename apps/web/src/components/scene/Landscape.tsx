import type { ReactNode } from 'react'
import { BushArt, Daisy, OakArt, PoplarArt, tuftPaths } from './art/Plants'
import { BarnTint } from './rewards/BarnTint'

type Tuft = readonly [x: number, y: number, dx: number, dy: number, mid: number]

/** Filled grass tufts (art/Plants); `near` is the darker front row. */
function Tufts({ tufts, near = false }: { tufts: readonly Tuft[]; near?: boolean }) {
  const parts = tufts.map(([x, y, dx, dy, mid]) => tuftPaths(x, y, dx, dy, mid))
  return (
    <g>
      <path d={parts.map((t) => t.dark).join(' ')} fill={near ? '#2F6424' : '#3A7629'} />
      <path d={parts.map((t) => t.light).join(' ')} fill={near ? '#4A8F37' : '#5AA343'} />
    </g>
  )
}

/**
 * The red barn with its shadow, drawn on the mobile artboard coordinates; the wide scene scales the same shapes.
 * `tint`: the player's barn colour, laid over the walls.
 */
export function BarnShapes({ tint = null }: { tint?: string | null }) {
  return (
    <>
<ellipse cx="80" cy="264" rx="74" ry="7" fill="#2F5A22" opacity=".35" />
<path d="M118 204 L148 214 L148 263 L118 263Z" fill="#88311F" />
<path d="M70 164 L100 172 L154 216 L124 207Z" fill="#3E2A1F" />
<rect x="127" y="226" width="12" height="12" fill="#3A2418" stroke="#F3EDE2" strokeWidth="1.5" />
<path d="M22 263 L22 203 L70 167 L118 203 L118 263Z" fill="url(#psBarn)" />
<path d="M34 194 V263 M46 185 V263 M58 176 V263 M82 176 V263 M94 185 V263 M106 194 V263" stroke="#8E3424" strokeWidth="1" opacity=".55" />
<path d="M15 208 L70 163 L125 208" stroke="#3E2A1F" strokeWidth="7" fill="none" strokeLinejoin="round" strokeLinecap="round" />
<path d="M22 203 L70 167 L118 203" stroke="#F3EDE2" strokeWidth="2.5" fill="none" />
<rect x="61" y="186" width="18" height="16" fill="#3A2418" stroke="#F3EDE2" strokeWidth="2" />
<path d="M62 201 C66 196 72 197 78 201Z" fill="#E2B85A" />
<rect x="48" y="221" width="44" height="42" fill="#8E3424" stroke="#F3EDE2" strokeWidth="3" />
<path d="M48 221 L92 263 M92 221 L48 263 M70 221 V263" stroke="#F3EDE2" strokeWidth="2.5" />
{tint ? <BarnTint color={tint} /> : null}
    </>
  )
}

/** Static hills, barn, trees and meadow (everything between the sky and the animals); `children` after the back fence. */
export function Landscape({ barnTint = null, children }: { barnTint?: string | null; children?: ReactNode }) {
  return (
    <>
<path d="M0 196 L22 182 L40 188 L66 164 L88 176 L112 158 L138 172 L160 150 L186 168 L214 146 L240 162 L268 152 L296 170 L324 154 L352 168 L390 156 L390 236 L0 236Z" fill="url(#psMtnA)" />
<path d="M154 156 L160 150 L167 157 L162 156 L160 159Z M207 153 L214 146 L221 153 L216 152 L214 155Z M107 162 L112 158 L117 163 L112 162Z" fill="#F5F9FB" />
<path d="M0 212 L34 196 L70 205 L104 188 L140 201 L178 186 L214 199 L252 184 L290 199 L330 189 L390 203 L390 246 L0 246Z" fill="url(#psMtnB)" />
<path d="M0 224 C60 206 130 208 190 220 C250 232 320 206 390 214 L390 272 L0 272Z" fill="url(#psHillFar)" />
<g><BushArt cx={176} cy={216} r={5} /><BushArt cx={184} cy={213} r={6} /><BushArt cx={193} cy={216} r={5} /><BushArt cx={201} cy={214} r={6} /><BushArt cx={210} cy={218} r={5} /><BushArt cx={274} cy={212} r={5} /><BushArt cx={282} cy={209} r={6} /><BushArt cx={291} cy={212} r={5} /><BushArt cx={24} cy={216} r={4} /><BushArt cx={31} cy={214} r={5} /></g>
<path d="M0 248 C70 232 150 236 222 246 C292 256 344 238 390 242 L390 302 L0 302Z" fill="url(#psHillMid)" />
<path d="M232 250 C262 254 300 252 334 245 L340 253 C306 261 266 262 236 258Z" fill="#C7CF74" opacity=".75" />
<g transform="translate(350 252) scale(.92)"><OakArt /></g>
<g transform="translate(152 250) scale(.83)"><PoplarArt /></g>
<g transform="translate(167.5 252) scale(.63)"><PoplarArt /></g>
<BarnShapes tint={barnTint} />
<rect x="150" y="250" width="26" height="16" rx="5" fill="#E2B85A" /><path d="M154 254 H172 M154 258 H172 M154 262 H172" stroke="#C3943B" strokeWidth="1" />
<rect x="160" y="238" width="20" height="13" rx="4" fill="#EBC56B" />
<path d="M0 272 C80 264 180 268 260 264 C320 261 360 264 390 262 L390 380 L0 380Z" fill="url(#psGrass)" />
<ellipse cx="98" cy="312" rx="100" ry="34" fill="#C7A56E" opacity=".5" />
<g fill="url(#psWood)"><rect x="2" y="272" width="196" height="4" rx="1.5" /><rect x="2" y="281" width="196" height="4" rx="1.5" /></g>
<g fill="#7A5230"><rect x="4" y="266" width="5" height="24" rx="1" /><rect x="52" y="266" width="5" height="24" rx="1" /><rect x="100" y="266" width="5" height="24" rx="1" /><rect x="148" y="266" width="5" height="24" rx="1" /><rect x="193" y="266" width="5" height="24" rx="1" /></g>
<Tufts tufts={[[220, 302, 3, 7, 9], [262, 322, 3, 7, 9], [304, 296, 3, 6, 8], [352, 318, 3, 7, 9], [244, 348, 3, 7, 9], [336, 352, 3, 7, 9], [372, 292, 2, 6, 8]]} />
<g><Daisy cx={232} cy={314} fill="#FFFFFF" s={0.8} /><Daisy cx={318} cy={334} fill="#FFFFFF" s={0.8} /><Daisy cx={364} cy={306} fill="#FFFFFF" s={0.8} /><Daisy cx={276} cy={340} fill="#F2C230" s={0.8} /><Daisy cx={206} cy={320} fill="#F2C230" s={0.8} /><Daisy cx={342} cy={344} fill="#F29BB8" s={0.8} /><Daisy cx={256} cy={302} fill="#F29BB8" s={0.8} /><Daisy cx={380} cy={330} fill="#B9A7F0" s={0.8} /></g>
{children}
    </>
  )
}

/** Static fence and grass tufts drawn in front of the animals. */
export function Foreground() {
  return (
    <>
<g fill="url(#psWood)"><rect x="2" y="330" width="198" height="5" rx="2" /><rect x="2" y="343" width="198" height="5" rx="2" /></g>
<g fill="#86592F"><rect x="3" y="320" width="7" height="40" rx="1.5" /><rect x="51" y="320" width="7" height="40" rx="1.5" /><rect x="99" y="320" width="7" height="40" rx="1.5" /><rect x="147" y="320" width="7" height="40" rx="1.5" /><rect x="194" y="320" width="7" height="40" rx="1.5" /></g>
<Tufts tufts={[[20, 380, 5, 12, 15], [120, 380, 4, 10, 13], [232, 380, 5, 12, 15], [300, 380, 4, 10, 13], [376, 380, 5, 12, 15]]} near />
    </>
  )
}
