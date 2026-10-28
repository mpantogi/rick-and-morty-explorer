export type ButtonVariant = 'primary' | 'secondary'

const BASE =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 font-semibold whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'button--primary bg-accent text-accent-fg hover:bg-accent/90',
  secondary: 'button--secondary border border-line-strong bg-surface text-fg hover:border-accent',
}

export function buttonClasses(variant: ButtonVariant): string {
  return `button ${VARIANTS[variant]} ${BASE}`
}
