import { FARM_NAME_MAX } from '@bc/protocol'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CameraIcon, Cta } from '../../components/ui'
import { canScanQr } from '../duel/parts/qrDecode'
import { QrScanSheet } from '../duel/parts/QrScanSheet'
import { CodeBoxes, farmCodeOf } from './CodeBoxes'
import { BODY, ERROR, HouseGlyph, Medal, MUTED, UserPlusGlyph } from './parts'

export interface FarmJoinViewProps {
  /** Pre-filled from `/ferma/:code`. */
  initialCode?: string
  creating: boolean
  joining: boolean
  /** Translated error of the last create / join, if it failed. */
  createError?: string | null
  joinError?: string | null
  onCreate(name: string): void
  onJoin(code: string): void
}

const CARD = { padding: 18, display: 'flex', flexDirection: 'column', gap: 12 } as const
const HEAD = { display: 'flex', alignItems: 'center', gap: 10 } as const

function CreateCard({ creating, createError, onCreate }: Pick<FarmJoinViewProps, 'creating' | 'createError' | 'onCreate'>) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [empty, setEmpty] = useState(false)
  function submit(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) {
      setEmpty(true)
      return
    }
    onCreate(clean)
  }
  const error = empty ? t('farm.join.nameEmpty') : createError
  return (
    <form className="card" style={CARD} onSubmit={submit} aria-labelledby="farm-create-title">
      <div style={HEAD}>
        <Medal tone="gold">
          <HouseGlyph />
        </Medal>
        <h2 id="farm-create-title" style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
          {t('farm.join.create')}
        </h2>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 800, fontSize: 14 }}>
        {t('farm.join.name')}
        <input
          className="field"
          value={name}
          maxLength={FARM_NAME_MAX}
          placeholder={t('farm.join.placeholder')}
          aria-invalid={empty || undefined}
          onChange={(e) => {
            setEmpty(false)
            setName(e.target.value)
          }}
        />
      </label>
      {error ? (
        <p role="alert" style={ERROR}>
          {error}
        </p>
      ) : null}
      <Cta type="submit" disabled={creating}>
        {t('farm.join.createCta')}
      </Cta>
    </form>
  )
}

function JoinCard({ initialCode = '', joining, joinError, onJoin }: Pick<FarmJoinViewProps, 'initialCode' | 'joining' | 'joinError' | 'onJoin'>) {
  const { t } = useTranslation()
  const [value, setValue] = useState(initialCode)
  const [invalid, setInvalid] = useState(false)
  const [scanning, setScanning] = useState(false)
  function submit(e: FormEvent) {
    e.preventDefault()
    const code = farmCodeOf(value)
    if (!code) {
      setInvalid(true)
      return
    }
    onJoin(code)
  }
  const error = invalid ? t('farm.join.invalid') : joinError
  return (
    <form className="card" style={CARD} onSubmit={submit} aria-labelledby="farm-join-title">
      <div style={{ ...HEAD, justifyContent: 'space-between' }}>
        <div style={HEAD}>
          <Medal tone="silver">
            <UserPlusGlyph />
          </Medal>
          <h2 id="farm-join-title" style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
            {t('farm.join.code')}
          </h2>
        </div>
        {canScanQr() ? (
          <button type="button" className="iconbox icobtn" style={{ width: 44, height: 44 }} aria-label={t('duel.joinCode.scan.button')} onClick={() => setScanning(true)}>
            <CameraIcon size={22} />
          </button>
        ) : null}
      </div>
      <CodeBoxes
        value={value}
        label={t('farm.join.codeAria')}
        invalid={invalid}
        describedBy="farm-code-help"
        onChange={(v) => {
          setInvalid(false)
          setValue(v)
        }}
      />
      {error ? (
        <p id="farm-code-help" role="alert" style={{ ...ERROR, textAlign: 'center' }}>
          {error}
        </p>
      ) : (
        <span id="farm-code-help" style={{ ...MUTED, textAlign: 'center', fontWeight: 700 }}>
          {t('farm.join.hint')}
        </span>
      )}
      <button type="submit" className="soft" disabled={joining}>
        {t('farm.join.cta')}
      </button>
      {scanning ? (
        <QrScanSheet
          onCode={(text) => {
            const code = farmCodeOf(text)
            if (!code) return
            setScanning(false)
            setValue(code)
            onJoin(code)
          }}
          onClose={() => setScanning(false)}
        />
      ) : null}
    </form>
  )
}

/** Р5 / ПД5 „Играйте заедно“: create a farm (and get a code) or join one with a code. */
export function FarmJoinView(props: FarmJoinViewProps) {
  const { t } = useTranslation()
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>{t('farm.join.title')}</h1>
        <p style={BODY}>{t('farm.join.text')}</p>
      </div>
      <CreateCard {...props} />
      <JoinCard {...props} />
    </>
  )
}
