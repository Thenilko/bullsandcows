// Generated from the design source (PasLegal.dc.html in the Design canvas). Edit the texts here.
// `{OPERATOR}`-style placeholders are filled from site.ts at render time; `[text](href)` becomes a link.
import type { InfoPages } from '../types'

export const en: InfoPages = {
  privacy: {
    title: 'Privacy policy',
    updated: '29 October 2026',
    intro:
      'We keep as little data as possible — just enough for the game to work, the leaderboards to be fair and your profile to be remembered. No ads, no analytics, no tracking.',
    sections: [
      {
        h: 'Who is responsible',
        p: [
          'The data controller is {OPERATOR}, a private individual. Write to {EMAIL} about anything related to your data.',
        ],
      },
      {
        h: 'What we collect',
        list: [
          'Profile: email, username and password. We never see the password — it is stored encrypted by the sign-in service.',
          'Guest: an anonymous identifier so you can continue your game on the same device.',
          'Play: your games, guesses, time, points, level, badges, streak, rank and duels (who you played and the result).',
          'Pasture: which rewards you have unlocked and the colour of your barn.',
          'Family farm: the farm you belong to, who invited you, nudges between members (from whom, to whom and on which day) and your reminder time, if you set one.',
          'Weekly challenge: your games for the week, your place on the board and the rewards (gold frame, badge).',
          'Shares: only how many times and how you shared a result — not what.',
          'Technical: your IP address, briefly, to limit excessive requests and sign-in attempts. It is not stored in the database.',
        ],
      },
      {
        h: 'What stays on your device',
        p: [
          'Notebook notes and marks, language, sound and your sign-in session live in your browser (local storage) and never reach us.',
        ],
      },
      {
        h: 'Why and on what basis',
        list: [
          'To run the game and your profile — performance of our agreement with you (Art. 6(1)(b) GDPR).',
          'For security and abuse prevention — legitimate interest (Art. 6(1)(f)).',
          "Leaderboards are public: your username, level and results are visible to other players, so don't use your real name if you'd rather not.",
          "On a farm, members see each other's names, levels and results and can nudge each other.",
        ],
      },
      {
        h: 'Who else sees the data',
        p: [
          'Two providers process data on our behalf: Supabase (sign-in and database) and Cloudflare (hosting and network). We do not sell or give data to anyone else. Some processing may take place outside the EU, under the EU Standard Contractual Clauses.',
        ],
      },
      {
        h: 'How long',
        p: [
          'As long as your profile exists. Guest profiles that have not played for 12 months are deleted automatically, together with their games. If you ask for deletion, we remove your profile and personal data within 30 days; in other players\' duels your name is replaced by "deleted player".',
        ],
      },
      {
        h: 'Cookies',
        p: [
          'We use no advertising, analytics or tracking cookies. The local storage we use (sign-in, language, sound, notebook, offline mode) is strictly necessary for the game and needs no consent.',
        ],
      },
      {
        h: 'Your rights',
        p: [
          "You can ask for access, correction, deletion, restriction or portability of your data, or object to its processing — write to {EMAIL} from your profile's email. We reply within 30 days. You may also complain to the Bulgarian Commission for Personal Data Protection ([cpdp.bg](https://www.cpdp.bg)).",
        ],
      },
      {
        h: 'Children',
        p: [
          "It is a family game with no age limit. Children under 14 may have a profile with an email only with a parent's consent — the easiest way is for the parent to create it together with the child. A parent can ask us to delete the child's profile at any time at {EMAIL}.",
        ],
      },
      {
        h: 'Changes',
        p: [
          'If we change this policy we will update the date above, and tell you in the game about important changes.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    updated: '26 October 2026',
    intro: 'Short and clear: the game is free, play fair and be kind to others.',
    sections: [
      {
        h: 'The service',
        p: [
          '"Bulls and Cows" is a free logic game provided by {OPERATOR}. By using it you accept these terms.',
        ],
      },
      {
        h: 'Profile',
        list: [
          'You can play as a guest or with a profile.',
          'You are responsible for your password and for what happens with your profile.',
          "Usernames are public — no insults, other people's names or advertising. We may change or block an unsuitable name.",
        ],
      },
      {
        h: 'Fair play',
        list: [
          'No bots, scripts or automated helpers in duels, leaderboards and weekly challenges.',
          'No exploiting bugs for points or rank — if you find one, tell us.',
          'For violations we may reset results or suspend the profile.',
        ],
      },
      {
        h: 'Points, badges and levels',
        p: [
          'They have no monetary value and cannot be bought or transferred. We may change the rules for points and levels to keep the game balanced.',
        ],
      },
      {
        h: 'Rights in the game',
        p: [
          'The design, characters (the bull, the cow, the Scarecrow), texts and code are protected. You may share your own results and screenshots.',
        ],
      },
      {
        h: 'Availability and liability',
        p: [
          'We do our best to keep the game running, but provide it "as is", without a guarantee of uninterrupted operation, and are not liable for losses from interruptions to the extent the law allows.',
        ],
      },
      {
        h: 'Ending',
        p: [
          'You can stop playing and ask for your profile to be deleted at any time. We may suspend a profile that breaks these terms.',
        ],
      },
      {
        h: 'Law and disputes',
        p: [
          'Bulgarian law applies. First of all, write to {EMAIL} — we will try to resolve it quickly.',
        ],
      },
    ],
  },
  legal: {
    title: 'Legal notice',
    updated: '29 October 2026',
    intro: 'Information under Art. 4 of the Bulgarian Electronic Commerce Act.',
    sections: [
      {
        h: 'Provider',
        list: ['{OPERATOR}, private individual', 'Email: {EMAIL}'],
      },
      {
        h: 'Supervisory authorities',
        list: [
          'Consumer Protection Commission — [kzp.bg](https://kzp.bg)',
          'Commission for Personal Data Protection — [cpdp.bg](https://www.cpdp.bg)',
        ],
      },
      {
        h: 'Hosting and infrastructure',
        list: [
          'Cloudflare, Inc. — hosting, network and server logic',
          'Supabase, Inc. — sign-in and database',
        ],
      },
      {
        h: 'Credits',
        p: [
          'The typeface is Nunito (SIL Open Font License). The game is built with open source software, including React, React Router, i18next, Zustand, TanStack Query and Hono, under their licences (mostly MIT).',
        ],
      },
    ],
  },
  support: {
    title: 'Support',
    intro:
      'Answers to the most common questions. If yours is not here, write to us — we read everything.',
    faq: [
      {
        q: 'How do I play?',
        a: 'The short rules are on the [How to play](/rules) page. In short: a bull is a right digit in the right place, a cow is a right digit in another place.',
      },
      {
        q: 'I forgot my password',
        a: 'On the sign-in screen tap "Forgot password?" and you will get a link for a new one by email.',
      },
      {
        q: 'How do I put the game on my phone?',
        a: 'iPhone: in Safari tap "Share" → "Add to Home Screen". Android: in Chrome open the menu → "Install app". The game then opens full screen like an app.',
      },
      {
        q: 'When does the daily number change?',
        a: "At midnight Bulgarian time. It is the same for everyone, so don't give the answer away — share only the card.",
      },
      {
        q: 'My duel dropped',
        a: 'If the connection drops you have 30 seconds to come back to the same game. If that fails, check your connection and try a rematch.',
      },
      {
        q: 'How do I delete my profile?',
        a: "Write to {EMAIL} from your profile's email. We delete it together with your personal data within 30 days.",
      },
      {
        q: 'I found a bug',
        a: 'Tell us what happened, on which device and browser, and the version at the bottom of the page (for example {VERSION}). A screenshot helps a lot.',
      },
    ],
  },
  story: {
    title: 'The story behind the game',
    intro: 'Made with love in Bulgaria.',
    sections: [
      {
        h: 'An old pencil-and-paper game',
        p: [
          '"Bulls and Cows" has been played for generations — on squared paper, between classes, on long car trips. One player hides a number, the other looks for it, and the only answers are "bulls" and "cows". The well-known board game Mastermind was later based on it, and one of the first computer versions was written as early as the late 1960s.',
        ],
      },
      {
        h: 'Why a pasture',
        p: [
          'We wanted the game to feel warm and clear for the whole family — so the digits became a herd, the fog lifts when you think right, and the bot opponent is the Scarecrow.',
        ],
      },
      {
        h: 'Who makes it',
        p: [
          'My name is Danail Simeonov. As kids we played "Bulls and Cows" for hours — on a page torn from a notebook, between classes and in the evenings at home. I missed the game and wanted to bring it back.',
          'My son is at school, and I was looking for something to train mathematical thinking that would not feel like homework. "Bulls and Cows" teaches logic, patience and testing ideas — and it is fun for the whole family.',
          'That is how the pasture was born: an old game in new clothes, played alone, against a friend or with the whole family on the farm. If you like it or have an idea, write to us at {EMAIL} — we read everything.',
        ],
      },
    ],
  },
  changelog: {
    title: "What's new",
    intro: 'Changes to the game, newest first.',
    entries: [
      {
        date: '2026-10-27',
        items: [
          'Your pasture: a windmill, a duck pond, a puppy, a rooster and more rewards unlocked by levels, badges and streaks, plus a barn colour of your choice.',
          'Family farm: bring up to 12 people together with a code, see your own leaderboard and nudge each other to play the number of the day.',
          'Weekly challenge: one number for the whole week with a new rule each time, a leaderboard and a gold frame for the top ten.',
          'A footer with pages on privacy, terms, support and the story of the game.',
          'The game opens in Bulgarian until you pick another language.',
        ],
      },
      {
        date: '2026-10-23',
        items: [
          'The game has its own address.',
          'Join a duel with a code, a pasted link or a scanned QR code.',
          'Sharing from a duel or a bot game now counts towards the "Storyteller" badge.',
          'The pasture is lighter — it falls asleep when you are not playing and spares the battery.',
        ],
      },
      {
        date: '2026-10-22',
        items: [
          '29 badges with tiers — bronze, silver and gold — and a notice when you earn one.',
          '"Share your result": a card and text in the style of daily games, without giving the number away.',
          'A number for the daily game.',
          'A new look on computers: the pasture fills the screen and the board hangs from the sky; on lower screens — scene and panel.',
          'New bulls and cows drawn like the characters, with gallop and walk.',
          'Longer levels and an honest day streak.',
        ],
      },
      {
        date: '2026-10-21',
        items: [
          'New logo, icon and home-screen look on phones.',
          'Comfortable play on shorter phone screens, without scrolling.',
        ],
      },
      {
        date: '2026-10-20',
        items: [
          'Duels against people — race and classic — and play against the Scarecrow with four levels.',
          'Quick-match queue and invites with a code.',
          'A notebook with marks and notes.',
          'Result, leaderboard, profile and badges.',
        ],
      },
      {
        date: '2026-10-18',
        items: ['First version of the pasture.'],
      },
    ],
  },
}
