import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Soft } from '../../../components/ui'
import { sfx } from '../../../lib/sound'
import { parseInviteCode, sanitizeTyping } from './joinCode'

const INPUT = {
  flex: 1,
  minWidth: 0,
  height: 48,
  borderRadius: 14,
  border: '1.5px solid #DCD4BF',
  background: '#FFFFFF',
  padding: '0 14px',
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  color: '#2E3B24',
  outline: 'none',
} as const

/** „Имаш код от приятел?“ — the joiner types (or pastes) the five-letter code and lands on `/d/:code`. */
export function JoinByCode() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const code = parseInviteCode(value)
    if (!code) {
      setInvalid(true)
      return
    }
    sfx.play('tap')
    void navigate(`/d/${code}`)
  }

  return (
    <form className="card" aria-label={t('duel.joinCode.area')} onSubmit={submit} style={{ padding: 'var(--card-pad, 16px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="setlab" htmlFor="join-code">
        {t('duel.joinCode.label')}
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id="join-code"
          style={INPUT}
          value={value}
          placeholder={t('duel.joinCode.placeholder')}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'join-code-error' : undefined}
          onChange={(e) => {
            setInvalid(false)
            setValue(sanitizeTyping(e.target.value))
          }}
          onPaste={(e) => {
            const code = parseInviteCode(e.clipboardData.getData('text'))
            if (code) {
              e.preventDefault()
              setInvalid(false)
              setValue(code)
            }
          }}
        />
        <Soft type="submit" style={{ minHeight: 48 }}>
          {t('duel.joinCode.cta')}
        </Soft>
      </div>
      {invalid ? (
        <p id="join-code-error" role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#8A1F0B' }}>
          {t('duel.joinCode.invalid')}
        </p>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-muted-aa)' }}>{t('duel.joinCode.hint')}</span>
      )}
    </form>
  )
}
