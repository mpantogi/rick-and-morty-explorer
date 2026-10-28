import { ViteSSG } from 'vite-ssg'

import App from './App.vue'
import { routes } from './router/routes'
import './styles/main.css'

const PRERENDERED_PATHS = ['/']

export const createApp = ViteSSG(App, { routes }, undefined, { registerComponents: false })

export function includedRoutes(): string[] {
  return PRERENDERED_PATHS
}
