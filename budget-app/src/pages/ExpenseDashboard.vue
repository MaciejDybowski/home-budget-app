<template>
  <v-container>
    <v-card class="mb-6">
      <v-card-title>Miesięczne wydatki według kategorii</v-card-title>
      <v-card-text>
        <v-data-table
          :headers="tableHeaders"
          :items="tableItems"
          :items-per-page="12"
          class="elevation-1 fixed-cols"
        >
          <!-- Kolorowane nagłówki kategorii -->
          <template
            v-for="cat in categories"
            :key="cat.id"
            #[`header.${cat.id}`]="{ column }"
          >
         <span
           :style="{
            backgroundColor: categoryColor(cat.id),
            color: getContrastTextColor(categoryColor(cat.id)),
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
              <td v-for="cat in categories" :key="cat.id" class="text-center">
                <strong>{{ getTotalForCategory(cat.id) }} zł</strong>
              </td>
              <td><strong>{{ getGrandTotal() }} zł</strong></td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- WYKRESY 2x2 -->
    <v-row>
      <!-- miesięczny bar -->
      <v-col cols="12" md="12">
        <v-card class="mb-6">
          <v-card-title class="d-flex align-center">
            Miesięczny słupkowy (kategorie)
            <v-spacer/>
            <v-autocomplete
              v-model="selectedMonth"
              :items="months"
              density="compact"
              hide-details
              label="Miesiąc"
              style="max-width: 220px"
              variant="outlined"
            />
          </v-card-title>
          <v-card-text>
            <Bar :data="barMonthlySelectedData" :options="barGroupedOptions"/>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- roczny bar -->
      <v-col cols="12" md="12">
        <v-card class="mb-6">
          <v-card-title>Roczny słupkowy (kategorie)</v-card-title>
          <v-card-text>
            <Bar :data="barYearlyData" :options="barGroupedOptions"/>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- miesięczny pie -->
      <v-col cols="12" md="6">
        <v-card class="mb-6">
          <v-card-title class="d-flex align-center">
            Miesięczny kołowy (kategorie)
            <v-spacer/>
            <v-autocomplete
              v-model="selectedMonth"
              :items="months"
              density="compact"
              hide-details
              label="Miesiąc"
              style="max-width: 220px"
              variant="outlined"
            />
          </v-card-title>
          <v-card-text>
            <Pie :data="pieMonthlySelectedData" :options="pieOptions"/>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- roczny pie -->
      <v-col cols="12" md="6">
        <v-card class="mb-6">
          <v-card-title>Roczny kołowy (kategorie)</v-card-title>
          <v-card-text>
            <Pie :data="pieYearlyData" :options="pieOptions"/>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="12">
        <v-card class="mb-6">
          <v-card-title class="d-flex align-center">
            Roczny słupkowy (jedna kategoria)
            <v-spacer/>
            <v-autocomplete
              v-model="selectedCategoryId"
              :items="categories"
              density="compact"
              hide-details
              item-title="name"
              item-value="id"
              label="Kategoria"
              style="max-width: 260px"
              variant="outlined"
            />
          </v-card-title>

          <v-card-text>
            <Bar
              :data="barYearlySingleCategoryData"
              :options="barGroupedOptions"
            />
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import axios from 'axios'
import {computed, onMounted, ref, watch} from 'vue'
import type {VDataTable} from 'vuetify/components'

import {Bar, Pie} from 'vue-chartjs'
import {ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip,} from 'chart.js'

import ChartDataLabels from 'chartjs-plugin-datalabels'


ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels)

interface Category {
  id: string,
  name: string
}

interface Expense {
  id: string,
  amount: number,
  categoryId: string,
  date: string
}

const categories = ref<Category[]>([])
const expenses = ref<Expense[]>([])

const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']
const selectedMonth = ref<string>(months[0])

const monthlyData = ref<Record<string, Record<string, number>>>({})

async function fetchData() {
  const catRes = await axios.get<Category[]>('/api/v1/categories')
  categories.value = catRes.data.sort((a, b) => a.name.localeCompare(b.name))

  const expRes = await axios.get<Expense[]>('/api/v1/expenses')
  expenses.value = expRes.data

  calculateMonthlyData()
  ensureSelectedMonthValid()
}

function ensureSelectedMonthValid() {
  if (!months.includes(selectedMonth.value)) selectedMonth.value = months[0]
}

watch(categories, ensureSelectedMonthValid)

function calculateMonthlyData() {
  const data: Record<string, Record<string, number>> = {}

  for (const month of months) {
    data[month] = {}
    for (const cat of categories.value) data[month][cat.id] = 0
  }

  for (const exp of expenses.value) {
    const month = exp.date.slice(0, 7)
    if (!data[month]) data[month] = {}
    if (!data[month][exp.categoryId]) data[month][exp.categoryId] = 0
    data[month][exp.categoryId] += exp.amount
  }

  monthlyData.value = data
}

/* ===== kolory (wspólne: tabela + wykresy) ===== */
function categoryColor(categoryId: string) {
  const cat = categories.value.find(c => c.id === categoryId)
  return cat?.color || "#cccccc"  // fallback
}

/* ===== tabela ===== */
type Headers = VDataTable['$props']['headers']


const tableHeaders = computed<Headers>(() => ([
  {
    title: 'Miesiąc',
    key: 'month',
  },
  ...categories.value.map(cat => ({
    title: cat.name,
    key: cat.id,
    cellProps: {
      class: 'text-center',
    },
  })),
  {
    title: 'Razem',
    key: 'total',
    cellProps: {
      class: 'text-center',
    },
  },
]))


function formatAmount(val: number) {
  return Number(val ?? 0).toFixed(2)
}

const tableItems = computed(() => (
  months.map(month => {
    const row: Record<string, any> = {month}
    for (const cat of categories.value) {
      row[cat.id] = formatAmount(monthlyData.value[month]?.[cat.id] ?? 0)
    }

    const totalNum = Object.values(monthlyData.value[month] ?? {}).reduce(
      (a, b) => a + (Number(b) || 0),
      0
    )
    row.total = formatAmount(totalNum)
    return row
  })
))

function getTotalForCategory(categoryId: string) {
  const sum = months.reduce((s, m) => s + (monthlyData.value[m]?.[categoryId] ?? 0), 0)
  return formatAmount(sum)
}

function getGrandTotal() {
  const sum = months.reduce(
    (s, m) => s + Object.values(monthlyData.value[m] ?? {}).reduce((a, b) => a + (Number(b) || 0), 0),
    0
  )
  return formatAmount(sum)
}

/* ===== wykresy: wspólne opcje ===== */


const commonDataLabels = {
  display: true,
  clamp: true,
  anchor: 'end',
  align: 'end',
  font: {
    weight: '600',
    size: 11,
  },
  formatter: (value: number) => {
    // pozwól wyświetlić 0 jako "0.00"
    if (value === null || value === undefined || value === '') return ''
    return `${formatAmount(Number(value))} zł`
  },
}

/* opcje wykresów: rzutujemy na any by uniknąć konfliktów typów Chart.js/Wrapping */
const barGroupedOptions = computed(() => ({
  responsive: true,
  plugins: {
    legend: {position: 'bottom' as const},
    datalabels: {
      ...commonDataLabels,
      color: '#333',
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const label = ctx.dataset?.label ?? ctx.label ?? ''
          const value = Number(ctx.parsed?.y ?? ctx.parsed ?? 0)

          // suma wszystkich datasetów dla danego "x"
          const dataIndex = ctx.dataIndex
          const datasets = ctx.chart.data.datasets ?? []
          const total = datasets.reduce((acc: number, ds: any) => acc + Number(ds.data?.[dataIndex] ?? 0), 0)

          const pct = total ? ((value / total) * 100).toFixed(1) : '0.0'
          return `${label}: ${formatAmount(value)} zł (${pct}%)`
        },
      },
    },
  },
  scales: {
    x: {
      stacked: false,
      barPercentage: 0.7,
      categoryPercentage: 0.8,
    },
    y: {stacked: false, beginAtZero: true},
  },
}) as any)

const pieOptions = computed(() => ({
  responsive: true,
  plugins: {
    legend: {position: 'bottom' as const},
    datalabels: {
      color: (ctx: any) => {
        const bg = Array.isArray(ctx.dataset.backgroundColor)
          ? ctx.dataset.backgroundColor[ctx.dataIndex]
          : ctx.dataset.backgroundColor
        return getContrastTextColor(String(bg))
      },
      font: {
        weight: '600',
        size: 12,
      },
      formatter: (value: number, ctx: any) => {
        const dataArr = ctx.chart.data.datasets[0].data as number[]
        const total = dataArr.reduce((a, b) => a + Number(b || 0), 0)
        if (!value || !total) return ''
        const pct = ((value / total) * 100).toFixed(1)
        return `${pct}%`
      },
      align: 'end',
      offset: 50,
      clamp: true,
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const label = ctx.label ?? ''
          const value = Number(ctx.parsed ?? 0)
          const dataArr = (ctx.dataset?.data ?? []) as Array<number>
          const total = dataArr.reduce((a, b) => a + Number(b || 0), 0)
          const pct = total ? ((value / total) * 100).toFixed(1) : '0.0'
          return `${label}: ${formatAmount(value)} zł (${pct}%)`
        },
      },
    },
  },
}) as any)


/* ===== wykresy: miesięczne (wybrany miesiąc) ===== */
const barMonthlySelectedData = computed(() => ({
  labels: [selectedMonth.value],
  datasets: categories.value.map(cat => ({
    label: cat.name,
    data: [monthlyData.value[selectedMonth.value]?.[cat.id] ?? 0],
    backgroundColor: categoryColor(cat.id),
  })),
}))

const pieMonthlySelectedData = computed(() => ({
  labels: categories.value.map(c => c.name),
  datasets: [
    {
      label: `Kategorie (${selectedMonth.value})`,
      data: categories.value.map(c => monthlyData.value[selectedMonth.value]?.[c.id] ?? 0),
      backgroundColor: categories.value.map(c => categoryColor(c.id)),
    },
  ],
}))

/* ===== wykresy: roczne ===== */
const yearlyPerCategory = computed(() => {
  const perCat: Record<string, number> = {}
  for (const cat of categories.value) perCat[cat.id] = 0

  for (const m of months) {
    for (const cat of categories.value) perCat[cat.id] += monthlyData.value[m]?.[cat.id] ?? 0
  }
  return perCat
})

const barYearlyData = computed(() => ({
  labels: ['2026'],
  datasets: categories.value.map(cat => ({
    label: cat.name,
    data: [yearlyPerCategory.value[cat.id] ?? 0],
    backgroundColor: categoryColor(cat.id),
  })),
}))

const pieYearlyData = computed(() => ({
  labels: categories.value.map(c => c.name),
  datasets: [
    {
      label: 'Kategorie (rok)',
      data: categories.value.map(c => yearlyPerCategory.value[c.id] ?? 0),
      backgroundColor: categories.value.map(c => categoryColor(c.id)),
    },
  ],
}))

const selectedCategoryId = ref<string | null>(null)

watch(categories, () => {
  if (!selectedCategoryId.value && categories.value.length) {
    selectedCategoryId.value = categories.value[0].id
  }
})

const barYearlySingleCategoryData = computed(() => {
  if (!selectedCategoryId.value) {
    return {labels: [], datasets: []}
  }

  const cat = categories.value.find(c => c.id === selectedCategoryId.value)

  return {
    labels: months,
    datasets: [
      {
        label: cat?.name ?? 'Kategoria',
        data: months.map(
          m => monthlyData.value[m]?.[selectedCategoryId.value!] ?? 0
        ),
        backgroundColor: categoryColor(selectedCategoryId.value),
      },
    ],
  }
})

function getContrastTextColor(hex: string) {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)

  // luminancja (WCAG)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.6 ? '#000000' : '#ffffff'
}

onMounted(fetchData)
</script>

<style lang="scss" scoped>

.category-header {
  display: block;
  padding: 6px 10px;
  border-radius: 8px;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
}


.totals-row td {
  background: rgba(0, 0, 0, 0.04);
}
</style>
