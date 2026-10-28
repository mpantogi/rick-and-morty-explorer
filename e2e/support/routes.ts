export interface AppRoute {
  name: string
  path: string
  // Responses the route causes on purpose, tolerated by the console guard.
  expectedHttpErrors: RegExp[]
}

export const ROUTES: readonly AppRoute[] = [
  { name: 'home', path: '/', expectedHttpErrors: [] },
  { name: 'not found', path: '/nope', expectedHttpErrors: [/\/nope$/] },
]
