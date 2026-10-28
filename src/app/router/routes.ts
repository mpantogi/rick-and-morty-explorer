import type { RouteRecordRaw } from 'vue-router'

import { HomePage } from '@/pages/home'

export const routes: RouteRecordRaw[] = [{ path: '/', name: 'home', component: HomePage }]
