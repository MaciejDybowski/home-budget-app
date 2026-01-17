<template>
  <v-container>

    <v-card class="mb-6">
      <v-card-title>Miesięczne przychody według źródła</v-card-title>
      <v-card-text>
        <v-data-table
          :headers="tableHeaders"
          :items="tableItems"
          :items-per-page="12"
          class="elevation-1 fixed-cols"
        >
          <!-- Kolorowane nagłówki źródeł -->
          <template
            v-for="src in sources"
            :key="src.id"
            #[`header.${src.id}`]="{ column }"
          >
            <span
              :style="{
                backgroundColor: sourceColor(src.id),
                color: getContrastTextColor(sourceColor(src.id)),
                'text-wrap-mode': 'nowrap'
              }"
              class="category-header"
            >
              {{ column.title }}
            </span>
          </template>

          <!-- Wiersz sum na końcu -->
          <template #body.append>
            <tr class="totals-row">
              <td><strong>Razem</strong></td>
              <td v-for="src in sources" :key="src.id" class="text-center">
                <strong>{{ getTotalForSource(src.id) }} zł</strong>
              </td>
              <td><strong>{{ getGrandTotal() }} zł</strong></td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- WYKRESY -->
    <v-row>
      <!-- miesięczny stacked bar (przychody per źródło) -->
      <v-col cols="12" md="12">
        <v-card class="mb-6">
          <v-card-title>
            Miesięczny słupkowy (przychody per źródło)
          </v-card-title>
          <v-card-text>
            <Bar :data="barMonthlyIncomeData" :options="barStackedOptions"/>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- miesięczne porównanie przychody vs wydatki -->
      <v-col cols="12" md="12">
        <v-card class="mb-6">
          <v-card-title>Miesięczne przychody vs wydatki</v-card-title>
          <v-card-text>
            <Bar :data="barIncomeVsExpensesData" :options="barGroupedOptions"/>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import axios from 'axios'
import {computed, onMounted, ref} from 'vue'
import {Bar} from 'vue-chartjs'
import {ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip} from 'chart.js'
/* ===== TABELA ===== */
import type {VDataTable} from 'vuetify/components'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

// Typy
interface Source {
  id: string
  name: string
  color?: string
}

interface Income {
  id: string
  amount: number
  sourceId: string
  date: string
}

interface Expense {
  id: string
  amount: number
  categoryId: string
  date: string
}

// DATA
const sources = ref<Source[]>([])
const incomes = ref<Income[]>([])
const expenses = ref<Expense[]>([])

const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']

const monthlyIncomeData = ref<Record<string, Record<string, number>>>({})
const monthlyExpenseData = ref<Record<string, Record<string, number>>>({})

// FETCH
async function fetchData() {
  const srcRes = await axios.get<Source[]>('/api/v1/sources')
  // sortowanie źródeł alfabetycznie po nazwie
  sources.value = srcRes.data.sort((a, b) => a.name.localeCompare(b.name))

  const incRes = await axios.get<Income[]>('/api/v1/incomes')
  incomes.value = incRes.data

  const expRes = await axios.get<Expense[]>('/api/v1/expenses')
  expenses.value = expRes.data

  calculateMonthlyIncomeData()
  calculateMonthlyExpenseData()
}

function calculateMonthlyIncomeData() {
  const data: Record<string, Record<string, number>> = {}
  for (const m of months) {
    data[m] = {}
    for (const src of sources.value) data[m][src.id] = 0
  }
  for (const inc of incomes.value) {
    const month = inc.date.slice(0, 7)
    if (!data[month]) data[month] = {}
    if (!data[month][inc.sourceId]) data[month][inc.sourceId] = 0
    data[month][inc.sourceId] += inc.amount
  }
  monthlyIncomeData.value = data
}

function calculateMonthlyExpenseData() {
  const data: Record<string, Record<string, number>> = {}
  for (const m of months) data[m] = {}
  for (const exp of expenses.value) {
    const month = exp.date.slice(0, 7)
    if (!data[month]) data[month] = {}
    data[month]['expenses'] = (data[month]['expenses'] ?? 0) + exp.amount
  }
  monthlyExpenseData.value = data
}

/* ===== kolory ===== */
function sourceColor(sourceId: string) {
  const src = sources.value.find(s => s.id === sourceId)
  return src?.color ?? "#8888ff"
}

function getContrastTextColor(hex: string) {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#ffffff'
}

type Headers = VDataTable['$props']['headers']

const tableHeaders = computed<Headers>(() => ([
  {title: 'Miesiąc', key: 'month', cellProps: {class: 'text-center'}},
  ...sources.value.map(s => ({
    title: s.name,
    key: s.id,
    cellProps: {class: 'text-center'}
  })),
  {
    title: 'Razem',
    key: 'total',
    cellProps: {
      class: 'text-center',
    },
  },
]))

const tableItems = computed(() => months.map(m => {
  const row: Record<string, any> = {month: m}
  for (const src of sources.value) row[src.id] = monthlyIncomeData.value[m]?.[src.id] ?? 0
  row.total = Object.values(monthlyIncomeData.value[m] ?? {}).reduce((a, b) => a + b, 0)
  return row
}))

function getTotalForSource(sourceId: string) {
  return months.reduce((sum, m) => sum + (monthlyIncomeData.value[m]?.[sourceId] ?? 0), 0)
}

function getGrandTotal() {
  return months.reduce((sum, m) => sum + Object.values(monthlyIncomeData.value[m] ?? {}).reduce((a, b) => a + b, 0), 0)
}

/* ===== wykresy ===== */
const barStackedOptions = {
  responsive: true,
  plugins: {legend: {position: 'bottom'},},
  scales: {x: {stacked: true}, y: {stacked: true, beginAtZero: true}},
}

const barGroupedOptions = {
  responsive: true,
  plugins: {legend: {position: 'bottom'}},
  scales: {x: {stacked: false, barPercentage: 0.7, categoryPercentage: 0.8}, y: {stacked: false, beginAtZero: true}}
}

// Miesięczny stacked bar przychody per źródło
const barMonthlyIncomeData = computed(() => ({
  labels: months,
  datasets: sources.value.map(s => ({
    label: s.name,
    data: months.map(m => monthlyIncomeData.value[m]?.[s.id] ?? 0),
    backgroundColor: sourceColor(s.id)
  }))
}))

// Miesięczne porównanie przychody vs wydatki
const barIncomeVsExpensesData = computed(() => ({
  labels: months,
  datasets: [
    {
      label: 'Przychody',
      data: months.map(m => Object.values(monthlyIncomeData.value[m] ?? {}).reduce((a, b) => a + b, 0)),
      backgroundColor: '#4CAF50'
    },
    {
      label: 'Wydatki',
      data: months.map(m => monthlyExpenseData.value[m]?.['expenses'] ?? 0),
      backgroundColor: '#F44336'
    }
  ]
}))

onMounted(fetchData)
</script>

<style scoped>
.category-header {
  display: block;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 600;
  text-align: center;
  line-height: 1.25;
}

.totals-row td {
  background: rgba(0, 0, 0, 0.04);
}
</style>
