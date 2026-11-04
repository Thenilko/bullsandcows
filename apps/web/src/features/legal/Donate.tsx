import { useTranslation } from 'react-i18next'
import styles from './legal.module.css'
import { SITE } from './site'

/** The „buy me a coffee“ card at the end of the help and story pages; the tip itself happens on Revolut. */
export function Donate() {
  const { t } = useTranslation()
  return (
    <section className={styles.donate} aria-labelledby="donate-title">
      <h2 id="donate-title" className={styles.h2}>
        {t('footer.donate.title')}
      </h2>
      <p className={styles.p}>{t('footer.donate.text')}</p>
      <a className={styles.donateCta} href={SITE.DONATE_URL} target="_blank" rel="noopener noreferrer">
        {t('footer.donate.cta')}
        <span className={styles.srOnly}> ({t('footer.donate.newTab')})</span>
      </a>
    </section>
  )
}
