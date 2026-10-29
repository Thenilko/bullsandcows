import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Soft } from '../../components/ui'
import { useSession } from '../auth/session'
import { useUpdateSettings } from '../stats/useUpdateSettings'
import { BellGlyph, Medal } from '../../screens/farm/parts'

const DEFAULT_TIME = '19:00'

/**
 * П4 „Напомняне всеки ден?“: picks a time and keeps it in the profile (`reminderTime`). Nothing is sent yet —
 * push notifications are a later part of the spec.
 */
/**
 * Daily reminders need Web Push (ЧАСТ 4), which is off until it is decided separately; without it the card would
 * promise a notification that never comes. A build with `VITE_PUSH_ENABLED=1` shows it.
 */
export const pushEnabled = (): boolean => import.meta.env.VITE_PUSH_ENABLED === '1'

export function ReminderCard() {
  const { t } = useTranslation()
  const saved = useSession((s) => s.me?.profile.reminderTime ?? null)
  const [time, setTime] = useState(saved ?? DEFAULT_TIME)
  const update = useUpdateSettings()
  const on = saved !== null
  return (
    <section className="card" aria-labelledby="reminder-title" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Medal tone="silver" size={40}>
          <BellGlyph />
        </Medal>
        <h2 id="reminder-title" style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
          {on ? t('farm.reminder.set', { time: saved }) : t('farm.reminder.title')}
        </h2>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#4A5640', lineHeight: 1.45 }}>{t('farm.reminder.text')}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="time"
          className="pill on"
          aria-label={t('farm.reminder.timeAria')}
          value={time}
          onChange={(e) => setTime(e.target.value || DEFAULT_TIME)}
          style={{ minHeight: 38, padding: '0 10px', fontWeight: 900 }}
        />
        <Soft
          style={{ flex: 1, minHeight: 44 }}
          disabled={update.isPending}
          onClick={() => update.mutate({ reminderTime: on && time === saved ? null : time })}
        >
          {on && time === saved ? t('farm.reminder.off') : t('farm.reminder.on')}
        </Soft>
      </div>
    </section>
  )
}
