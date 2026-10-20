import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { Card, Cta, Field } from '../components/ui'
import { completeRecovery, RecoveryError } from '../features/auth/recovery'
import { useSession } from '../features/auth/session'
import { isSupabaseMode } from '../features/auth/SupabaseSession'
import { ApiError } from '../lib/api'
import { sfx } from '../lib/sound'
import { IDLE_SCENE } from './idleScene'

const MIN_PASSWORD = 6
const STACK = { display: 'flex', flexDirection: 'column', gap: 12 } as const
const TEXT = { margin: 0, fontSize: 15, fontWeight: 700, color: '#4A5640', lineHeight: 1.5 } as const
const ERROR_STYLE = { margin: 0, fontWeight: 800, fontSize: 14, color: '#8A1F0B' } as const
const LINK_STYLE = { fontWeight: 800, color: '#8E3424', textDecoration: 'underline', minHeight: 36 } as const

function failureKey(e: unknown): string {
  if (e instanceof RecoveryError) return e.key
  if (e instanceof ApiError) return e.status === 0 ? 'error.network' : 'reset.error.failed'
  return 'reset.error.failed'
}

function validate(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return 'reset.validation.short'
  return password === confirm ? null : 'reset.validation.mismatch'
}

function NewPasswordForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    sfx.play('tap')
    const invalid = validate(password, confirm)
    setMessage(invalid)
    if (invalid) return
    setBusy(true)
    try {
      const res = await completeRecovery(password)
      useSession.getState().setAuth(res)
      useSession.getState().setRecoverySession(false)
      void navigate('/', { replace: true })
    } catch (e) {
      setMessage(failureKey(e))
      setBusy(false)
    }
  }

  return (
    <form
      aria-label={t('reset.area')}
      style={STACK}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <p style={TEXT}>{t('reset.text')}</p>
      <Field label={t('reset.password')} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field label={t('reset.confirm')} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <p role="status" style={ERROR_STYLE}>
        {message ? t(message) : ''}
      </p>
      <Cta type="submit" disabled={busy}>
        {t('reset.submit')}
      </Cta>
    </form>
  )
}

function hasRecoveryHash(): boolean {
  return typeof window !== 'undefined' && /type=recovery/.test(window.location.hash)
}

function ResetBody() {
  const { t } = useTranslation()
  const recovery = useSession((s) => s.recoverySession)
  if (!isSupabaseMode()) return <p style={TEXT}>{t('reset.unavailable')}</p>
  if (recovery) return <NewPasswordForm />
  return <p style={TEXT}>{t(hasRecoveryHash() ? 'reset.checking' : 'reset.noLink')}</p>
}

/** /reset — landing of the password-recovery mail link (public). */
export function ResetPassword() {
  const { t } = useTranslation()
  return (
    <Shell scene={IDLE_SCENE} bare>
      <Card style={{ padding: 24, ...STACK }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>{t('reset.title')}</h1>
        <ResetBody />
        <Link to="/login" style={LINK_STYLE}>
          {t('reset.back')}
        </Link>
      </Card>
    </Shell>
  )
}
