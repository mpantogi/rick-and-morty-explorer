import pluginVitest from '@vitest/eslint-plugin'
import { vueTsConfigs, withVueTs } from '@vue/eslint-config-typescript'
import { globalIgnores } from 'eslint/config'
import skipFormatting from 'eslint-config-prettier/flat'
import boundaries from 'eslint-plugin-boundaries'
import pluginPlaywright from 'eslint-plugin-playwright'
import { configs as sonarjsConfigs } from 'eslint-plugin-sonarjs'
import pluginVue from 'eslint-plugin-vue'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'

const SLICED = ['pages', 'widgets', 'features', 'entities'] as const
const ALLOWED: Record<string, string[]> = {
  app: ['pages', 'widgets', 'features', 'entities', 'shared'],
  pages: ['widgets', 'features', 'entities', 'shared'],
  widgets: ['features', 'entities', 'shared'],
  features: ['entities', 'shared'],
  entities: ['shared'],
}

export default withVueTs(
  { name: 'app/files', files: ['**/*.{ts,mts,vue}'] },
  globalIgnores([
    'dist/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '.vite-ssg-temp/**',
    '.yarn/**',
    '.pipeline/**',
    '.pipeline-*/**',
    'tasks/**',
  ]),
  ...pluginVue.configs['flat/recommended'],
  ...pluginVueA11y.configs['flat/recommended'],
  vueTsConfigs.strictTypeChecked,
  sonarjsConfigs.recommended,
  {
    name: 'app/ts',
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    name: 'app/vue',
    files: ['**/*.vue'],
    rules: {
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/no-v-html': 'error',
      'vue/define-macros-order': [
        'error',
        { order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'] },
      ],
      'vue/define-props-destructuring': 'error',
      'vue/no-unused-refs': 'error',
      'vue/prefer-use-template-ref': 'error',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/require-explicit-slots': 'error',
      'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
    },
  },
  {
    name: 'app/fsd-boundaries',
    files: ['src/**/*.{ts,vue}'],
    plugins: { boundaries },
    settings: {
      'boundaries/root-path': import.meta.dirname,
      'boundaries/ignore': ['**/*.test.ts'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app', partialMatch: false },
        ...SLICED.map((layer) => ({
          type: layer,
          pattern: `src/${layer}/*`,
          partialMatch: false,
          capture: ['slice'],
        })),
        { type: 'shared', pattern: 'src/shared', partialMatch: false },
      ],
      'import/resolver': {
        typescript: {
          project: './tsconfig.app.json',
          alwaysTryTypes: true,
          extensions: ['.ts', '.vue', '.js', '.json'],
        },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            ...Object.entries(ALLOWED).map(([from, to]) => ({
              from: { element: { type: from } },
              allow: { to: { element: { type: to } } },
            })),
            {
              disallow: { to: { element: { type: [...SLICED], fileInternalPath: '!index.ts' } } },
              message: 'Import {{to.element.captured.slice}} through its index.ts',
            },
            {
              disallow: { to: { element: { type: 'shared', fileInternalPath: '!*/index.ts' } } },
              message: 'Import shared segments through their index.ts',
            },
          ],
        },
      ],
    },
  },
  { ...pluginVitest.configs.recommended, files: ['src/**/*.test.ts', 'build/**/*.test.ts'] },
  { ...pluginPlaywright.configs['flat/recommended'], files: ['e2e/**/*.ts'] },
  skipFormatting,
)
