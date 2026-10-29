import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Shell } from '../../app/layouts/Shell'
import { Card } from '../../components/ui'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { IDLE_SCENE } from '../../screens/idleScene'
import { useSession } from '../auth/session'
import { infoPages } from './content'
import { RichText } from './RichText'
import { SiteFooter } from './SiteFooter'
import styles from './legal.module.css'
import { EMAIL_PLACEHOLDER, SITE } from './site'
import type { InfoKey, InfoPage as Content } from './types'

function Body({ page }: { page: Content }) {
  const { t } = useTranslation()
  return (
    <>
      {page.sections?.map((s) => (
        <section key={s.h}>
          <h2 className={styles.h2}>{s.h}</h2>
          {s.p?.map((p) => (
            <p key={p} className={styles.p}>
              <RichText text={p} />
            </p>
          ))}
          {s.list ? (
            <ul className={styles.ul}>
              {s.list.map((li) => (
                <li key={li}>
                  <RichText text={li} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      {page.faq?.map((f) => (
        <details key={f.q} className={styles.faq}>
          <summary>{f.q}</summary>
          <p className={styles.p}>
            <RichText text={f.a} />
          </p>
        </details>
      ))}
      {page.faq ? (
        <div className={styles.contact}>
          <b>{t('footer.stillStuck')}</b>
          {SITE.EMAIL ? (
            <a className={styles.a} href={`mailto:${SITE.EMAIL}`}>
              {SITE.EMAIL}
            </a>
          ) : (
            <span>{EMAIL_PLACEHOLDER}</span>
          )}
        </div>
      ) : null}
      {page.entries?.map((e) => (
        <section key={e.date} className={styles.release}>
          <h2 className={styles.date} style={{ margin: 0 }}>
            {e.date}
          </h2>
          <ul className={styles.ul}>
            {e.items.map((it) => (
              <li key={it}>
                <RichText text={it} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

/** One public info page (privacy, terms, legal notice, support, story, changelog), ending with the footer. */
export function InfoPage({ page: key }: { page: InfoKey }) {
  const { t, i18n } = useTranslation()
  const desktop = useIsDesktop()
  const authed = useSession((s) => s.session !== null)
  const page = infoPages(i18n.language)[key]
  const content = (
    <article className={desktop ? `${styles.page} ${styles.desk}` : styles.page}>
      <Link to={authed ? '/' : '/login'} className={styles.back}>
        {t('footer.back')}
      </Link>
      <h1 className={styles.h1}>{page.title}</h1>
      {page.updated ? (
        <span className={styles.updated}>{t('footer.updated', { date: page.updated })}</span>
      ) : null}
      <p className={styles.intro}>
        <RichText text={page.intro} />
      </p>
      <Body page={page} />
    </article>
  )
  return (
    <Shell scene={IDLE_SCENE} screen="rules" bare={!authed}>
      {desktop ? (
        <Card style={{ padding: 28 }}>
          {content}
          <SiteFooter />
        </Card>
      ) : (
        <>
          {content}
          <SiteFooter />
        </>
      )}
    </Shell>
  )
}
