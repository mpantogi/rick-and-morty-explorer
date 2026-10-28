import { nextTick } from 'vue'
import type { Router } from 'vue-router'

export function installRouteFocus(router: Router): void {
  router.afterEach((to, from) => {
    if (from.matched.length === 0 || to.path === from.path) return
    void nextTick(() => {
      document.getElementById('page-title')?.focus({ preventScroll: true })
    })
  })
}
