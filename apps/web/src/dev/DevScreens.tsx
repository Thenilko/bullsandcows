import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { Lang } from '@bc/i18n'
import { setLang } from '../i18n'
import { devScreens } from './registry'

const WIDTHS = new Set(['390', '1280'])

function isLang(v: string | null): v is Lang {
  return v === 'bg' || v === 'en'
}

export function DevScreens() {
  const [params] = useSearchParams()
  const name = params.get('screen')
  const lang = params.get('lang')
  const w = params.get('w')

  useEffect(() => {
    if (isLang(lang)) setLang(lang)
  }, [lang])

  if (!name) {
    return (
      <nav style={{ padding: 16 }} aria-label="Dev screens">
        <h1>Dev screens</h1>
        <ul>
          {Object.keys(devScreens).map((key) => (
            <li key={key}>
              <Link to={`/dev/screens?screen=${key}`}>{key}</Link>
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  const Screen = devScreens[name]
  if (!Screen) return <p style={{ padding: 16 }}>Unknown screen: {name}</p>
  return (
    <div style={{ maxWidth: w && WIDTHS.has(w) ? `${w}px` : undefined, margin: '0 auto' }}>
      <Screen />
    </div>
  )
}
