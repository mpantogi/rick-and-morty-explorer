import type { Hero } from '../../src/entities/character/model/hero-schema.ts'

// Its image is an API avatar URL, which the API mock already serves.
export const PORTAL_PETE: Hero = {
  id: '6c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  name: 'Portal Pete',
  gender: 'male',
  image: 'https://rickandmortyapi.com/api/character/avatar/5.jpeg',
  createdAt: '2026-10-28T12:00:00.000Z',
}
