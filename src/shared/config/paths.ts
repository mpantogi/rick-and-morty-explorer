export const paths = {
  home: '/',
  favorites: '/favorites',
  createHero: '/heroes/new',
  character: (id: number) => `/characters/${id}`,
  hero: (id: string) => `/heroes/${id}`,
} as const
