import { InfoPage } from './InfoPage'

// One named export per route, so the router's lazy `page()` helper can load each.
export const PrivacyPage = () => <InfoPage page="privacy" />
export const TermsPage = () => <InfoPage page="terms" />
export const LegalPage = () => <InfoPage page="legal" />
export const ChangelogPage = () => <InfoPage page="changelog" />
export const PressPage = () => <InfoPage page="press" />
export const SupportPage = () => <InfoPage page="support" />
export const StoryPage = () => <InfoPage page="story" />
