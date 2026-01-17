<style scoped>
:deep(.chart-container) {
  height: 300px;
}
</style>


<template>
  <v-container>
    <h1>Odczyty liczników</h1>

    <v-row>
      <!-- FILTR: rok i miesiąc + typ licznika -->
      <v-col cols="12" md="3">
        <v-autocomplete
          v-model="selectedYear"
          :items="years"
          clearable
          dense
          item-title="label"
          item-value="value"
          label="Rok"
        />
      </v-col>

      <v-col cols="12" md="3">
        <v-autocomplete
          v-model="selectedMonth"
          :items="months.map(m => ({ label: m.label, value: m.value }))"
          clearable
          dense
          item-title="label"
          item-value="value"
          label="Miesiąc"
        />
      </v-col>

      <v-col cols="12" md="3">
        <v-autocomplete
          v-model="selectedMeterType"
          :items="meterTypes.map(t => ({ label: t.name, value: t.id }))"
          clearable
          dense
          item-title="label"
          item-value="value"
          label="Typ licznika"
        />
      </v-col>

      <!-- COL 12: tabela odczytów -->
      <v-col cols="12">
        <v-card class="mt-4">
          <v-card-title>Lista odczytów</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="readingHeaders"
              :items="filteredReadings"
              :items-per-page="50"
              item-key="id"
            >
              <template #item.meter="{ item }">
                <v-chip
                  :style="{ backgroundColor: item.meter.color || '#cccccc', color: getContrastTextColor(item.meter.color || '#cccccc') }"
                  size="small"
                >
                  {{ item.meter.name }} ({{ item.meter.unit }})
                </v-chip>
              </template>

              <template #item.date="{ item }">
                {{ new Date(item.date).toLocaleDateString() }}
              </template>

              <template #item.monthlyConsumption="{ item }">
                {{ getMonthlyConsumption(item).toFixed(2) }} {{ item.meter.unit }}
              </template>

              <template #item.limitStatus="{ item }">
                <v-chip
                  :color="getLimitStatusColor(item)"
                  size="small"
                  variant="tonal"
                >
                  {{ getLimitStatusText(item) }}
                </v-chip>
              </template>

              <template #item.actions="{ item }">
                <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEditReading(item)"/>
                <v-btn color="error" icon="mdi-delete" size="small" variant="text" @click="deleteReading(item.id)"/>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- WYKREZY per typ licznika -->
      <v-col v-if="selectedMeterType" cols="12">
        <v-card class="mt-4">
          <v-card-title>
            Wykresy dla: {{ getMeterTypeName(selectedMeterType.value) }}
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="12">
                <v-card class="pa-4">
                  <Line :data="actualVsExpectedChartData" :options="lineChartOptions"/>
                </v-card>
              </v-col>
              <v-col cols="12" md="12">
                <v-card class="pa-4">
                  <Bar :data="monthlyConsumptionChartData" :options="barChartOptions"/>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- FORMULARZ: Nowy odczyt -->
      <v-col cols="12" md="4">
        <v-card class="mt-4">
          <v-card-title>Nowy odczyt</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="createReading">
              <v-select
                v-model="newReading.meterTypeId"
                :items="meterTypes"
                item-title="name"
                item-value="id"
                label="Typ licznika"
                required
              />
              <v-text-field
                v-model.number="newReading.value"
                label="Wartość"
                required
                step="0.01"
                type="number"
              />
              <v-text-field
                v-model="newReading.date"
                label="Data odczytu"
                required
                type="date"
              />
              <v-btn block class="mt-2" color="primary" type="submit">Zapisz</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- FORMULARZ: Nowy typ licznika -->
      <v-col cols="4">
        <v-card class="mt-4">
          <v-card-title>Nowy typ licznika</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="createMeterType">
              <v-text-field v-model="newMeterType.name" label="Nazwa" required/>
              <v-text-field v-model="newMeterType.unit" label="Jednostka" required/>
              <v-text-field v-model="newMeterType.color" label="Kolor (hex)" type="color"/>
              <v-text-field
                v-model.number="newMeterType.expectedMonthlyUsage"
                label="Oczekiwane miesięczne zużycie"
                step="0.01"
                type="number"
              />
              <v-btn block class="mt-2" color="primary" type="submit">Dodaj typ</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Lista typów liczników -->
      <v-col cols="12">
        <v-card class="mt-4">
          <v-card-title>Typy liczników</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="meterTypeHeaders"
              :items="meterTypes"
              dense
              item-key="id"
            >
              <template #item.color="{ item }">
                <v-chip
                  :style="{ backgroundColor: item.color || '#cccccc', color: getContrastTextColor(item.color || '#cccccc') }"
                  size="small"
                >
                  {{ item.color || '–' }}
                </v-chip>
              </template>
              <template #item.actions="{ item }">
                <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEditMeterType(item)"/>
                <v-btn color="error" icon="mdi-delete" size="small" variant="text" @click="deleteMeterType(item.id)"/>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogi bez zmian -->
    <v-dialog v-model="editReadingDialog" max-width="480">
      <!-- ... dialog edycji odczytu bez zmian ... -->
    </v-dialog>

    <v-dialog v-model="editMeterTypeDialog" max-width="480">
      <!-- ... dialog edycji typu licznika bez zmian ... -->
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
import axios from 'axios'
import {computed, onMounted, ref, watch} from 'vue'
import {Bar, Line} from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, BarElement, CategoryScale, LinearScale, PointElement)

interface MeterType {
  id: string
  name: string
  unit: string
  color?: string
  expectedMonthlyUsage?: number
}

interface MeterReading {
  id: string
  date: string
  value: number
  meterTypeId: string
  meter: MeterType
}

// Stan aplikacji
const meterTypes = ref<MeterType[]>([])
const readings = ref<MeterReading[]>([])
const selectedMeterType = ref<string | null>(null)

// Formularze i dialogi (bez zmian)
const newReading = ref({meterTypeId: null, value: null, date: new Date().toISOString().slice(0, 10)})
const newMeterType = ref({name: '', unit: '', color: '', expectedMonthlyUsage: null})
const editReadingDialog = ref(false)
const editedReading = ref<MeterReading>({
  id: '',
  meterTypeId: '',
  value: 0,
  date: '',
  meter: {id: '', name: '', unit: ''}
})
const editMeterTypeDialog = ref(false)
const editedMeterType = ref<MeterType>({id: '', name: '', unit: '', color: '', expectedMonthlyUsage: 0})

// Nagłówki tabel - DODANA KOLUMNA "Faktyczne zużycie"
const readingHeaders = [
  {title: 'Typ licznika', key: 'meter'},
  {title: 'Wartość', key: 'value'},
  {title: 'Faktyczne zużycie', key: 'monthlyConsumption'},
  {title: 'Data', key: 'date'},
  {title: 'Status limitu', key: 'limitStatus'},
  {title: 'Akcje', key: 'actions', sortable: false},
]

const meterTypeHeaders = [
  {title: 'Nazwa', key: 'name'},
  {title: 'Jednostka', key: 'unit'},
  {title: 'Kolor', key: 'color'},
  {title: 'Oczekiwane zużycie', key: 'expectedMonthlyUsage'},
  {title: 'Akcje', key: 'actions', sortable: false},
]

// Filtrowanie
const months = [
  {label: 'Styczeń', value: '01'}, {label: 'Luty', value: '02'}, {label: 'Marzec', value: '03'},
  {label: 'Kwiecień', value: '04'}, {label: 'Maj', value: '05'}, {label: 'Czerwiec', value: '06'},
  {label: 'Lipiec', value: '07'}, {label: 'Sierpień', value: '08'}, {label: 'Wrzesień', value: '09'},
  {label: 'Październik', value: '10'}, {label: 'Listopad', value: '11'}, {label: 'Grudzień', value: '12'},
]

const currentYear = new Date().getFullYear()
const years = Array.from({length: 5}, (_, i) => ({
  label: (currentYear - i).toString(),
  value: (currentYear - i).toString()
}))

const selectedYear = ref(currentYear.toString())
const selectedMonth = ref('')

// NOWE FUNKCJE DLA ZUŻYCIA
function getPreviousMonthReading(currentReading: MeterReading): MeterReading | null {
  const currentDate = new Date(currentReading.date)
  const targetMonth = currentDate.getMonth()
  const targetYear = currentDate.getFullYear()
  const prevMonth = (targetMonth - 1 + 12) % 12
  const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear

  return readings.value.find(r =>
    r.meterTypeId === currentReading.meterTypeId &&
    new Date(r.date).getMonth() === prevMonth &&
    new Date(r.date).getFullYear() === prevYear
  ) || null
}

function getMonthlyConsumption(reading: MeterReading): number {
  const prevReading = getPreviousMonthReading(reading)
  return prevReading ? reading.value - prevReading.value : 0
}

function getMeterTypeName(id: string): string {
  return meterTypes.value.find(t => t.id === id)?.name || ''
}

// Status limitu
function getLimitStatusText(reading: MeterReading): string {
  const meter = reading.meter
  const consumption = getMonthlyConsumption(reading)
  const limit = meter.expectedMonthlyUsage || 0

  if (!limit || limit === 0) return 'Brak limitu'
  if (consumption > limit) return `Przekroczono (+${(consumption - limit).toFixed(1)})`
  if (consumption > limit * 0.9) return 'Blisko limitu'
  return 'OK'
}

function getLimitStatusColor(reading: MeterReading): string {
  const meter = reading.meter
  const consumption = getMonthlyConsumption(reading)
  const limit = meter.expectedMonthlyUsage || 0

  if (!limit || limit === 0) return 'grey'
  if (consumption > limit) return 'error'
  if (consumption > limit * 0.9) return 'warning'
  return 'success'
}

// DANE WYKRESÓW PER TYPU LICZNIKA
const actualVsExpectedChartData = computed(() => {
  if (!selectedMeterType.value) return {labels: [], datasets: []}

  const meterType = meterTypes.value.find(t => t.id === selectedMeterType.value)
  if (!meterType) return {labels: [], datasets: []}

  // 1. Weź tylko ten licznik
  const meterReadings = readings.value
    .filter(r => r.meterTypeId === selectedMeterType.value)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // 2. Grupuj "ostatnie odczyty" w miesiącu
  const byMonth: Record<string, MeterReading> = {}

  meterReadings.forEach(r => {
    const d = new Date(r.date)
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`

    // nadpisujemy, więc zostaje ostatni
    byMonth[key] = r
  })

  const keys = Object.keys(byMonth).sort()

  const consumption = keys.map((key, idx) => {
    if (idx === 0) return 0
    const curr = byMonth[key]
    const prev = byMonth[keys[idx - 1]]
    return curr.value - prev.value
  })

  const expected = keys.map(() => meterType.expectedMonthlyUsage || 0)

  return {
    labels: keys.map(k => {
      const [y, m] = k.split('-')
      return `${m}/${y.slice(-2)}`
    }),
    datasets: [
      {
        label: 'Faktyczne zużycie',
        data: consumption,
        borderColor: '#2196F3',
        tension: 0.3,
      },
      {
        label: 'Zakładane zużycie',
        data: expected,
        borderColor: '#FF9800',
        borderDash: [5, 5],
        tension: 0.3,
      }
    ]
  }
})


const monthlyConsumptionChartData = computed(() => {
  if (!selectedMeterType.value) return {labels: [], datasets: []}

  const meterReadings = readings.value
    .filter(r => r.meterTypeId === selectedMeterType.value)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const labels = meterReadings.map(r => new Date(r.date).toLocaleDateString('pl-PL'))
  const consumptionData = meterReadings.map(r => getMonthlyConsumption(r))

  return {
    labels,
    datasets: [{
      label: 'Miesięczne zużycie',
      data: consumptionData,
      backgroundColor: 'rgba(76, 175, 80, 0.6)',
      borderColor: 'rgba(76, 175, 80, 1)',
      borderWidth: 1
    }]
  }
})


const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {position: 'top' as const}
  },
  scales: {
    y: {beginAtZero: true}
  }
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {display: false}
  },
  scales: {
    y: {beginAtZero: true}
  }
}

// Filtrowanie z nowym filtrem typu licznika
const filteredReadings = computed(() =>
  readings.value.filter(r => {
    const date = new Date(r.date)
    const matchesYear = date.getFullYear().toString() === selectedYear.value
    const matchesMonth = selectedMonth.value ? (date.getMonth() + 1).toString().padStart(2, '0') === selectedMonth.value : true
    const matchesMeterType = selectedMeterType.value ? r.meterTypeId === selectedMeterType.value : true
    return matchesYear && matchesMonth && matchesMeterType
  })
)

// Watch dla wykresów
watch([selectedMeterType, selectedYear, selectedMonth], () => {
  // Wykresy automatycznie się odświeżają dzięki computed
})

// Reszta kodu bez zmian (API, helpers, etc.)
function getContrastTextColor(hex: string) {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#ffffff'
}


// API
async function loadMeterTypes() {
  meterTypes.value = (await axios.get<MeterType[]>('/api/v1/meters/types')).data
}

async function loadReadings() {
  readings.value = (await axios.get<MeterReading[]>('/api/v1/meters/readings')).data
}

async function createReading() {
  if (!newReading.value.meterTypeId || newReading.value.value === null) return
  const res = await axios.post<MeterReading>('/api/v1/meters/readings', {
    ...newReading.value,
    date: new Date(newReading.value.date)
  })
  readings.value.push(res.data)
  newReading.value = {meterTypeId: null, value: null, date: new Date().toISOString().slice(0, 10)}
}

function openEditReading(r: MeterReading) {
  editedReading.value = {...r, date: r.date.slice(0, 10)};
  editReadingDialog.value = true
}

async function updateReading() {
  const res = await axios.patch<MeterReading>(
    `/api/v1/meters/readings/${editedReading.value.id}`,
    {
      meterTypeId: editedReading.value.meterTypeId,
      value: editedReading.value.value,
      date: new Date(editedReading.value.date)
    }
  )
  const idx = readings.value.findIndex(r => r.id === res.data.id);
  if (idx !== -1) readings.value[idx] = res.data
  editReadingDialog.value = false
}

async function deleteReading(id: string) {
  await axios.delete(`/api/v1/meters/readings/${id}`);
  readings.value = readings.value.filter(r => r.id !== id)
}

async function createMeterType() {
  if (!newMeterType.value.name || !newMeterType.value.unit) return
  const res = await axios.post<MeterType>('/api/v1/meters/types', newMeterType.value)
  meterTypes.value.push(res.data)
  newMeterType.value = {name: '', unit: '', color: '', expectedMonthlyUsage: null}
}

function openEditMeterType(t: MeterType) {
  editedMeterType.value = {...t};
  editMeterTypeDialog.value = true
}

async function updateMeterType() {
  const res = await axios.patch<MeterType>(`/api/v1/meters/types/${editedMeterType.value.id}`, editedMeterType.value)
  const idx = meterTypes.value.findIndex(t => t.id === res.data.id);
  if (idx !== -1) meterTypes.value[idx] = res.data
  editMeterTypeDialog.value = false
}

async function deleteMeterType(id: string) {
  await axios.delete(`/api/v1/meters/types/${id}`);
  meterTypes.value = meterTypes.value.filter(t => t.id !== id)
}

onMounted(async () => {
  await Promise.all([loadMeterTypes(), loadReadings()])
})
</script>

<style scoped>
:deep(.chart-container) {
  height: 350px !important;
}
</style>
