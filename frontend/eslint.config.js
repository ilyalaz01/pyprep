import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    /**
     * T4.5.3: forbid window.location.href as a navigation mechanism in
     * components/ and pages/. TanStack Link / LinkButton / useNavigate
     * keep the SPA cache warm and skip a full reload. Two sites carry
     * `// eslint-disable-next-line no-restricted-syntax` + a TODO(phase-5)
     * comment because their target route doesn't exist yet.
     */
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "AssignmentExpression[left.object.object.name='window'][left.object.property.name='location'][left.property.name='href']",
          message:
            'Use TanStack Link / LinkButton / useNavigate instead of window.location.href = ... (full page reload, drops cache). If the route is Phase-5+ and not yet defined, add // TODO(phase-5) + // eslint-disable-next-line no-restricted-syntax.',
        },
      ],
    },
  },
])
