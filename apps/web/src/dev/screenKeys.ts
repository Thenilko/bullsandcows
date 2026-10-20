/**
 * Gallery screen keys, kept in a side-effect-free module so Playwright specs can enumerate them
 * without importing React components. `registry.test.tsx` asserts this list matches `devScreens`.
 */
export const DEV_SCREEN_KEYS: readonly string[] = [
  'scene-idle',
  'scene-play',
  'scene-result',
  'primitives',
  'mobile-shell',
  'desktop-shell',
  'login',
  'login-register',
  'login-error',
  'rules',
  'new-game',
  'play-start',
  'play-mid',
  'play-win',
  'result-win',
  'result-lose',
  'result-practice',
  'board',
  'board-guest',
  'profile',
  'profile-guest',
  'notebook',
  'play-desktop-notebook',
]
