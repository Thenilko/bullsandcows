import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Cta, Field } from '../../components/ui'
import { sfx } from '../../lib/sound'
import { useAuth } from './useAuth'

const MIN_NAME = 2
const MIN_PASSWORD = 6
const ERROR_STYLE = { margin: 0, fontWeight: 800, fontSize: 14, color: '#8A1F0B' } as const

/** Inline form that turns a guest session into a registered profile. */
export function UpgradeDialog() {
  const { t } = useTranslation()
  const auth = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [local, setLocal] = useState('')

  async function submit() {
    if (name.trim().length < MIN_NAME) return fail(t('login.validation.nameShort'))
    if (password.length < MIN_PASSWORD) return fail(t('login.validation.passwordShort'))
    setLocal('')
    sfx.play('tap')
    const pass = password
    setPassword('')
    await auth.upgrade(name.trim(), email.trim(), pass)
  }

  function fail(message: string) {
    sfx.play('err')
    setLocal(message)
  }

  const server = auth.offline ? t('error.network') : auth.error ? t(`error.${auth.error}`) : ''
  return (
    <Card style={{ padding: 16 }}>
      <form
        aria-label={t('common.createProfile')}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <Field
          label={t('login.name')}
          autoComplete="username"
          placeholder={t('login.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label={t('login.email')}
          type="email"
          autoComplete="email"
          placeholder={t('login.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={t('login.password')}
          type="password"
          autoComplete="new-password"
          placeholder={t('login.passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p role="status" style={ERROR_STYLE}>
          {local || server}
        </p>
        <Cta type="submit" disabled={auth.status === 'loading'}>
          {t('login.submitRegister')}
        </Cta>
      </form>
    </Card>
  )
}
