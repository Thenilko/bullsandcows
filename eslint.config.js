import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['.worktrees/**', '.claude/**', '**/test-results/**', '**/playwright-report/**', '**/dist/**', '**/dist-gallery/**', '**/coverage/**', '**/.wrangler/**', 'design/**', '**/*.tsbuildinfo', '**/worker-configuration.d.ts'] },
  ...tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
)
