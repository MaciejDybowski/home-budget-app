import {setupLayouts} from 'virtual:generated-layouts'
import {createRouter, createWebHistory} from 'vue-router'
import IncomeDashboard from "@/pages/IncomeDashboard.vue";
import ExpenseDashboard from "@/pages/ExpenseDashboard.vue";
import {Routes} from './routes'
import Expenses from "@/pages/Expenses.vue";
import Incomes from "@/pages/Incomes.vue";
import BatchExpenses from "@/pages/BatchExpenses.vue";
import Categories from "@/pages/Categories.vue";
import Meters from "@/pages/Meters.vue";

const routes = [
  {path: Routes.ROOT, redirect: Routes.EXPENSES_DASHBOARD},
  {path: Routes.EXPENSES_DASHBOARD, component: ExpenseDashboard},
  {path: Routes.EXPENSES, component: Expenses},
  {path: Routes.INCOMES_DASHBOARD, component: IncomeDashboard},
  {path: Routes.INCOMES, component: Incomes},
  {path: Routes.BATCH_EXPENSES, component: BatchExpenses},
  {path: Routes.CATEGORIES, component: Categories},
  {path: Routes.METERS, component: Meters},
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
})

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (localStorage.getItem('vuetify:dynamic-reload')) {
      console.error('Dynamic import error, reloading page did not fix it', err)
    } else {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router
