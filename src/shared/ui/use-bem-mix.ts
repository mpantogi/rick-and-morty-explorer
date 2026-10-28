import { useAttrs } from 'vue'

interface BemMix {
  mix: () => unknown
  rest: () => Record<string, unknown>
}

// Vue appends a parent's classes after the root's own utilities. With inheritAttrs off, a primitive
// binds rest() and puts mix() (the parent's BEM mix) between its BEM classes and its utilities.
export function useBemMix(): BemMix {
  const attrs = useAttrs()
  return {
    mix: () => attrs.class,
    rest: () => Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class')),
  }
}
