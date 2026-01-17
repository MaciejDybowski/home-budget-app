export const Routes = {
  ROOT: '/',
  EXPENSES_DASHBOARD: '/expenses-dashboard',
  INCOMES_DASHBOARD: '/incomes-dashboard',
  EXPENSES: "/expenses",
  INCOMES: "/incomes",
  BATCH_EXPENSES: "/batch-expenses",
  CATEGORIES: "/categories",
  METERS: "/meters",
} as const

export type RoutePath = typeof Routes[keyof typeof Routes]
