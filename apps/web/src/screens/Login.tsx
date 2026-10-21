import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { Card, Cta, Field, Inset, LangSwitch, Seg, Soft } from '../components/ui'
import { useAuth } from '../features/auth/useAuth'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { sfx } from '../lib/sound'
import { IDLE_SCENE } from './idleScene'
import { useLoginForm, type AuthTab, type LoginInitial } from './useLoginForm'

const FEATURES = ['daily', 'board', 'notebook'] as const
const ERROR_STYLE = { margin: 0, fontWeight: 800, fontSize: 14, color: '#8A1F0B', minHeight: 0 } as const
const LINK_STYLE = { fontWeight: 800, color: '#8E3424', textDecoration: 'underline', minHeight: 36 } as const
const STACK = { display: 'flex', flexDirection: 'column', gap: 12 } as const

function ForgotPassword() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const { reset, status, error, offline } = useAuth()

  async function send() {
    sfx.play('tap')
    setSent(await reset(email.trim()))
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ minHeight: 36, fontWeight: 800, color: '#8E3424', textDecoration: 'underline' }}
      >
        {t('login.forgot')}
      </button>
    )
  }
  const message = sent ? t('login.resetSent') : offline ? t('error.network') : error ? t(`error.${error}`) : ''
  return (
    <div style={STACK}>
      <Field
        label={t('login.email')}
        type="email"
        autoComplete="email"
        placeholder={t('login.emailPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <p role="status" style={ERROR_STYLE}>
        {message}
      </p>
      <Soft small onClick={() => void send()} disabled={status === 'loading' || email.trim() === ''}>
        {t('common.ok')}
      </Soft>
    </div>
  )
}

function Fields({ form }: { form: ReturnType<typeof useLoginForm> }) {
  const { t } = useTranslation()
  return (
    <>
      <Field
        label={t('login.name')}
        autoComplete="username"
        placeholder={t('login.namePlaceholder')}
        value={form.name}
        onChange={(e) => form.setName(e.target.value)}
      />
      {form.tab === 'register' ? (
        <Field
          label={t('login.email')}
          type="email"
          autoComplete="email"
          placeholder={t('login.emailPlaceholder')}
          value={form.email}
          onChange={(e) => form.setEmail(e.target.value)}
        />
      ) : null}
      <Field
        label={t('login.password')}
        type="password"
        autoComplete={form.tab === 'register' ? 'new-password' : 'current-password'}
        placeholder={t('login.passwordPlaceholder')}
        value={form.password}
        onChange={(e) => form.setPassword(e.target.value)}
      />
    </>
  )
}

function Features() {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 8 }}>
      {FEATURES.map((f) => (
        <Inset key={f} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <b>{t(`login.feature.${f}.title`)}</b>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4A5640' }}>{t(`login.feature.${f}.desc`)}</span>
        </Inset>
      ))}
    </div>
  )
}

function Header({ desktop }: { desktop: boolean }) {
  const { t } = useTranslation()
  if (desktop) {
    return (
      <>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 900, lineHeight: 1.05 }}>{t('login.welcome')}</h1>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#4A5640', lineHeight: 1.5 }}>{t('login.welcomeText')}</p>
      </>
    )
  }
  // M1: the horizontal logo (emblem, wordmark and the tagline) stands in for the title and the subtitle.
  return (
    <h1 className="rise" style={{ margin: 0, lineHeight: 0 }}>
      <img src="/logo-horizontal.svg" alt={t('login.title')} width={1016} height={340} style={{ width: '100%', maxWidth: 300, height: 'auto' }} />
    </h1>
  )
}

export function LoginForm({ initial }: { initial?: LoginInitial }) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const form = useLoginForm(initial)
  const loading = form.auth.status === 'loading'
  const tabs: readonly { value: AuthTab; label: string }[] = [
    { value: 'login', label: t('login.tabs.login') },
    { value: 'register', label: t('login.tabs.register') },
  ]
  return (
    <form
      style={{ ...STACK, ...(desktop ? { gap: 14 } : {}) }}
      aria-label={t('login.area')}
      onSubmit={(e) => {
        e.preventDefault()
        void form.submit()
      }}
      noValidate
    >
      <Header desktop={desktop} />
      <Seg label={t('login.tabs.group')} value={form.tab} options={tabs} onChange={form.chooseTab} />
      <Fields form={form} />
      <p role="status" style={ERROR_STYLE}>
        {form.message}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(auto-fit, minmax(150px, 1fr))' : '1fr', gap: 10 }}>
        <Cta type="submit" disabled={loading}>
          {form.tab === 'register' ? t('login.submitRegister') : t('login.submitLogin')}
        </Cta>
        <Soft disabled={loading} onClick={() => void form.guest()}>
          {t('login.guest')}
        </Soft>
      </div>
    </form>
  )
}

function LoginBody({ initial }: { initial?: LoginInitial }) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  return (
    <div style={{ ...STACK, gap: 14 }}>
      <LoginForm initial={initial} />
      <ForgotPassword />
      {desktop ? <Features /> : <Link to="/rules" style={LINK_STYLE}>{t('login.howTo')}</Link>}
      <LangSwitch />
    </div>
  )
}

export function Login({ initial }: { initial?: LoginInitial }) {
  const desktop = useIsDesktop()
  return (
    <Shell scene={IDLE_SCENE} bare>
      {desktop ? (
        <Card style={{ padding: 32 }}>
          <LoginBody initial={initial} />
        </Card>
      ) : (
        <LoginBody initial={initial} />
      )}
    </Shell>
  )
}
