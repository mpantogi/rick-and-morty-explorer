import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const RULE = 'boundaries/dependencies'
const LINT_TIMEOUT_MS = 60_000

const eslint = new ESLint({ cwd: process.cwd() })

// Each case lints code as if it lived in an existing file of the importing layer,
// so the real config, resolver and TypeScript project all apply.
async function boundaryMessages(filePath: string, code: string): Promise<string[]> {
  const [{ messages }] = await eslint.lintText(code, { filePath })
  const fatal = messages.find((message) => message.fatal)
  if (fatal) throw new Error(`Could not lint ${filePath}: ${fatal.message}`)
  return messages.filter((message) => message.ruleId === RULE).map((message) => message.message)
}

describe('FSD boundaries gate', { timeout: LINT_TIMEOUT_MS }, () => {
  it('rejects shared importing a feature', async () => {
    const messages = await boundaryMessages(
      'src/shared/config/paths.ts',
      "import { useTheme } from '@/features/theme'\nexport const probe = useTheme\n",
    )

    expect(messages).toEqual([
      expect.stringMatching(/from elements of type "shared".* to elements of type "features"/),
    ])
  })

  it('rejects a feature importing a widget', async () => {
    const messages = await boundaryMessages(
      'src/features/theme/model/use-theme.ts',
      "import { AppHeader } from '@/widgets/layout'\nexport const probe = AppHeader\n",
    )

    expect(messages).toEqual([
      expect.stringMatching(/from elements of type "features".* to elements of type "widgets"/),
    ])
  })

  it('rejects a deep import that bypasses a slice public API', async () => {
    const messages = await boundaryMessages(
      'src/pages/home/index.ts',
      "import { useTheme } from '@/features/theme/model/use-theme'\nexport const probe = useTheme\n",
    )

    expect(messages).toEqual(['Import theme through its index.ts'])
  })

  it('allows a widget to import a feature through its public API', async () => {
    const messages = await boundaryMessages(
      'src/widgets/layout/index.ts',
      "import { ThemeToggle } from '@/features/theme'\nexport const probe = ThemeToggle\n",
    )

    expect(messages).toEqual([])
  })

  it('allows any layer to import external packages', async () => {
    const messages = await boundaryMessages(
      'src/shared/config/paths.ts',
      "import { ref } from 'vue'\nexport const probe = ref(0)\n",
    )

    expect(messages).toEqual([])
  })
})
