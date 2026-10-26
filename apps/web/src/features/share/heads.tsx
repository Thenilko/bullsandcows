import { renderToStaticMarkup } from 'react-dom/server'
import { BullHead, CowHead } from '../../components/ui/characters'

/** The character heads as static SVG markup (`<g>…</g>`) for the PNG template; loaded on demand. */
export function headMarkup(kind: 'bull' | 'cow'): string {
  return renderToStaticMarkup(kind === 'bull' ? <BullHead /> : <CowHead />)
}
