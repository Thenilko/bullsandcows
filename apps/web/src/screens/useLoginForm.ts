import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../features/auth/useAuth'
import { sfx } from '../lib/sound'

export type AuthTab = 'login' | 'register'

const MIN_NAME = 2
const MIN_PASSWORD = 6

/** Form state and client-side checks for the Login screen. */
export interface LoginInitial {
  tab?: AuthTab
  /** Pre-filled message; used by the dev gallery to show the error state. */
  message?: string
}

export function useLoginForm(initial: LoginInitial = {}) {
  const { t } = useTranslation()
  const auth = useAuth()
  const [tab, setTab] = useState<AuthTab>(initial.tab ?? 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [local, setLocal] = useState(initial.message ?? '')

  function invalid(): string | null {
    if (name.trim().length < MIN_NAME) return t('login.validation.nameShort')
    if (tab === 'register' && password.length < MIN_PASSWORD) return t('login.validation.passwordShort')
    return null
  }

  async function submit() {
    const problem = invalid()
    if (problem) {
      sfx.play('err')
      setLocal(problem)
      return
    }
    setLocal('')
    sfx.play('tap')
    const pass = password
    setPassword('')
    if (tab === 'register') await auth.register(name.trim(), email.trim(), pass)
    else await auth.login(name.trim(), pass)
  }

  function chooseTab(next: AuthTab) {
    setTab(next)
    setLocal('')
  }

  async function guest() {
    sfx.play('tap')
    setLocal('')
    await auth.guest()
  }

  const serverMessage = auth.offline ? t('error.network') : auth.error ? t(`error.${auth.error}`) : ''
  return {
    auth,
    tab,
    chooseTab,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    message: local || serverMessage,
    submit,
    guest,
  }
}
