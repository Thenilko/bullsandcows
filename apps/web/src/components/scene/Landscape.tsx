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
<ellipse cx="80" cy="264" rx="74" ry="7" fill="#2F5A22" opacity=".35"/>
<path d="M118 204 L148 214 L148 263 L118 263Z" fill="#88311F" stroke="#2E3B24" strokeWidth="1.6" strokeLinejoin="round"/>
<path d="M128 207.4 V263 M138 210.8 V263" stroke="#6E2618" strokeWidth=".9"/>
<rect x="125.6" y="224.6" width="14.8" height="14.8" fill="none" stroke="#2E3B24" strokeWidth="1"/>
<rect x="127" y="226" width="12" height="12" fill="#3A2418" stroke="#F3EDE2" strokeWidth="1.5"/>
<path d="M133 226 V238 M127 232 H139" stroke="#F3EDE2" strokeWidth="1"/>
<path d="M70 164 L100 172 L154 216 L124 207Z" fill="#4A3226" stroke="#2E3B24" strokeWidth="1.6" strokeLinejoin="round"/>
<path d="M88 178.2 L118 186.5 M106 192.4 L136 201" stroke="#33221A" strokeWidth="1.1"/>
<path d="M22 263 L22 203 L70 167 L118 203 L118 263Z" fill="url(#psBarn)" stroke="#2E3B24" strokeWidth="1.6" strokeLinejoin="round"/>
<path d="M34 194 V263 M46 185 V263 M58 176 V263 M82 176 V263 M94 185 V263 M106 194 V263" stroke="#8E3424" strokeWidth="1" opacity=".55"/>
<path d="M24 206 V259 M116 206 V259" stroke="#F3EDE2" strokeWidth="2.6"/>
<path d="M22 259 L118 259 L118 263 L22 263Z M118 259 L148 259 L148 263 L118 263Z" fill="#9A948A" stroke="#2E3B24" strokeWidth="1"/>
<path d="M15 208 L70 163 L125 208" stroke="#2E3B24" strokeWidth="9.6" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
<path d="M15 208 L70 163 L125 208" stroke="#4A3226" strokeWidth="7" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
<path d="M17 205.4 L70 162 L123 205.4" stroke="#6E4A36" strokeWidth="1.4" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
<path d="M22 203 L70 167 L118 203" stroke="#F3EDE2" strokeWidth="2.5" fill="none"/>
<rect x="65" y="175.4" width="10" height="4" fill="#5A3A26" stroke="#2E3B24" strokeWidth=".9"/>
<path d="M70 179.4 V183.4" stroke="#2E3B24" strokeWidth=".9"/>
<rect x="59.6" y="184.6" width="20.8" height="18.8" fill="none" stroke="#2E3B24" strokeWidth="1"/>
<rect x="61" y="186" width="18" height="16" fill="#3A2418" stroke="#F3EDE2" strokeWidth="2"/>
<path d="M62 201 C66 195.4 72 196 78 201Z" fill="#E8C268" stroke="#2E3B24" strokeWidth=".7"/>
<path d="M64 200 l2 -3.4 M68 200 l.6 -4 M72 200 l-.4 -3.8 M75.6 200 l-1.4 -3" stroke="#B88A2E" strokeWidth=".7"/>
<circle cx="70" cy="214.6" r="2.3" fill="#F2C230" stroke="#2E3B24" strokeWidth=".8"/>
<path d="M70 212.3 V209.6" stroke="#2E3B24" strokeWidth="1"/>
<rect x="46.4" y="219.4" width="47.2" height="43.6" fill="none" stroke="#2E3B24" strokeWidth="1.2"/>
<rect x="48" y="221" width="44" height="42" fill="#8E3424" stroke="#F3EDE2" strokeWidth="3"/>
<path d="M48 221 L92 263 M92 221 L48 263 M70 221 V263" stroke="#F3EDE2" strokeWidth="2.5"/>
<circle cx="66.4" cy="243" r="1.3" fill="#F3EDE2" stroke="#2E3B24" strokeWidth=".5"/><circle cx="73.6" cy="243" r="1.3" fill="#F3EDE2" stroke="#2E3B24" strokeWidth=".5"/>
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
<path d="M161.0 242.6 l-1.4 -1.0 M179.0 245.2 l1.4 -0.8 M166.0 238.6 l-0.6 -1.6 M172.4 238.6 l0.8 -1.3" stroke="#C9973A" strokeWidth="0.63" strokeLinecap="round"/><rect x="160" y="238" width="20" height="13" rx="3.1" fill="#E3B95C" stroke="#2E3B24" strokeWidth="0.9"/><rect x="161.1" y="239.0" width="17.8" height="3.4" rx="1.7" fill="#F2D488"/><path d="M160.9 248.1 H179.1 V249.1 Q179.1 250.1 176.9 250.1 H163.1 Q160.9 250.1 160.9 249.1Z" fill="#C9973A" opacity=".55"/><path d="M162.4 243.8 l3.2 0.7 M164.0 247.4 l2.4 -0.7 M168.4 242.9 l2.8 0.7 M171.0 246.6 l3.2 -0.7 M175.6 244.5 l2.4 0.7 M177.2 247.9 l2.0 -0.7 M166.8 248.7 l2.0 0.7 M172.8 241.9 l2.0 -0.7" stroke="#B88A2E" strokeWidth="0.54" strokeLinecap="round"/><path d="M165.4 238 V251 M174.6 238 V251" stroke="#2E3B24" strokeWidth="2.01"/><path d="M165.4 238 V251 M174.6 238 V251" stroke="#9C6B34" strokeWidth="1.20"/><path d="M151.0 255.6 l-1.8 -1.3 M175.0 258.8 l1.8 -1.0 M157.8 250.6 l-0.8 -1.9 M166.1 250.6 l1.0 -1.6" stroke="#C9973A" strokeWidth="0.63" strokeLinecap="round"/><rect x="150" y="250" width="26" height="16" rx="3.8" fill="#E3B95C" stroke="#2E3B24" strokeWidth="0.9"/><rect x="151.1" y="251.0" width="23.8" height="4.2" rx="2.1" fill="#F2D488"/><path d="M150.9 262.5 H175.1 V263.7 Q175.1 265.1 172.2 265.1 H153.8 Q150.9 265.1 150.9 263.7Z" fill="#C9973A" opacity=".55"/><path d="M153.1 257.2 l4.2 0.8 M155.2 261.5 l3.1 -0.8 M160.9 256.1 l3.6 0.8 M164.3 260.6 l4.2 -0.8 M170.3 258.0 l3.1 0.8 M172.4 262.2 l2.6 -0.8 M158.8 263.1 l2.6 0.8 M166.6 254.8 l2.6 -0.8" stroke="#B88A2E" strokeWidth="0.54" strokeLinecap="round"/><path d="M157.0 250 V266 M169.0 250 V266" stroke="#2E3B24" strokeWidth="2.25"/><path d="M157.0 250 V266 M169.0 250 V266" stroke="#9C6B34" strokeWidth="1.44"/>
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
