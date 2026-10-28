export const paths = {
  home: '/',
  favorites: '/favorites',
  createHero: '/heroes/new',
  character: (id: number) => `/characters/${id}`,
} as const
