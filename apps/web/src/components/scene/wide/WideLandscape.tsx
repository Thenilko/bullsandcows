import { Bushes, FrontFlora } from './Flora'

/** Fence posts of the pen, 76 apart from x 250 (nine posts). */
const POST_XS = Array.from({ length: 9 }, (_, i) => 250 + 76 * i)

/** Mountains with snow caps, the far hill with bushes and the mid hill. */
export function Hills() {
  return (
    <>
<path d="M0 420 L52 378 L122 363 L163 373 L214 384 L296 351 L344 403 L410 394 L453 390 L508 369 L572 404 L648 380 L728 375 L812 311 L862 382 L934 341 L993 347 L1062 394 L1149 410 L1222 369 L1311 388 L1386 367 L1455 305 L1538 364 L1618 312 L1600 520 L0 520Z" fill="url(#psMtnA)" />
<path d="M800 321 L812 311 L825 322 L817 319 L812 324Z M1443 315 L1455 305 L1468 316 L1460 313 L1455 318Z M1606 322 L1618 312 L1631 323 L1623 320 L1618 325Z " fill="#F5F9FB" />
<path d="M0 440 L78 421 L190 392 L287 392 L390 403 L503 429 L593 430 L672 393 L768 391 L840 406 L936 396 L999 425 L1078 428 L1191 405 L1279 411 L1378 414 L1471 415 L1588 410 L1673 419 L1600 540 L0 540Z" fill="url(#psMtnB)" />
<path d="M0 470 C200 440 420 446 640 462 C860 478 1100 440 1320 452 C1450 460 1540 450 1600 452 L1600 600 L0 600Z" fill="url(#psHillFar)" />
<Bushes />
<path d="M0 520 C220 492 460 500 700 516 C940 532 1180 498 1400 506 C1500 510 1560 506 1600 504 L1600 640 L0 640Z" fill="url(#psHillMid)" />
    </>
  )
}

/** Grass, the dirt path to the pen and the lighter patch where the cows graze. */
export function Meadow() {
  return (
    <>
<path d="M0 580 C240 566 520 572 800 566 C1060 560 1320 570 1600 562 L1600 900 L0 900Z" fill="url(#psGrass)" />
<path d="M760 900 C740 820 700 760 640 720 C600 694 560 680 520 660 L560 660 C620 684 700 712 760 744 C840 790 880 850 900 900Z" fill="#D7BE8A" opacity=".8" />
<ellipse cx="1150" cy="700" rx="240" ry="54" fill="#8CC665" opacity=".45" />
    </>
  )
}

interface RailProps {
  rails: readonly [number, number]
  railHeight: number
  postY: number
  postWidth: number
  postHeight: number
}

function Rail({ rails, railHeight, postY, postWidth, postHeight }: RailProps) {
  return (
    <>
      <g fill="url(#psWood)">
        {rails.map((y) => (
          <rect key={y} x="250" y={y} width="610" height={railHeight} rx="2" />
        ))}
      </g>
      <g fill="#86592F">
        {POST_XS.map((x) => (
          <rect key={x} x={x} y={postY} width={postWidth} height={postHeight} rx="1.5" />
        ))}
      </g>
    </>
  )
}

/** Trampled ground of the pen and its back rail (drawn before the animals). */
export function PenBack() {
  return (
    <>
      <ellipse cx="560" cy="676" rx="300" ry="62" fill="#C7A56E" opacity=".5" />
      <Rail rails={[598, 610]} railHeight={6} postY={592} postWidth={8} postHeight={40} />
    </>
  )
}

/** Front rail of the pen, big tufts and flowers (drawn after the animals). */
export function WideForeground() {
  return (
    <>
      <Rail rails={[720, 742]} railHeight={9} postY={714} postWidth={11} postHeight={62} />
      <FrontFlora />
    </>
  )
}
