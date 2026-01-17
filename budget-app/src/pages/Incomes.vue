<template>
  <v-container>
    <h1>Przychody</h1>

    <v-row>
      <!-- COL 9: tabela przychodów -->
      <v-col cols="12" md="9">

        <v-autocomplete
          v-model="selectedMonth"
          :items="months.map(m => ({ label: m.label, value: `${new Date().getFullYear()}-${m.value}` }))"
          clearable
          dense
          item-title="label"
          item-value="value"
          label="Miesiąc"
        />


        <v-card>
          <v-card-title>Lista przychodów</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="incomeHeaders"
              :items="filteredIncomes"
              :items-per-page="10"
              item-key="id"
            >
              <!-- kolumna źródło -->
              <template #item.source="{ item }">
                <v-chip
                  :style="{ backgroundColor: sourceColor(item.sourceId), color: getContrastTextColor(sourceColor(item.sourceId)) }"
                  size="small"
                >
                  {{ sourceName(item.sourceId) }}
                </v-chip>
              </template>

              <!-- kolumna data -->
              <template #item.date="{ item }">
                {{ new Date(item.date).toLocaleDateString() }}
              </template>

              <!-- kolumna akcje -->
              <template #item.actions="{ item }">
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="openEditDialog(item)"
                />
                <v-btn
                  color="error"
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  @click="deleteIncome(item.id)"
                />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- COL 3: formularz dodawania -->
      <v-col cols="12" md="3">
        <v-card>
          <v-card-title>Nowy przychód</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="createIncome">
              <v-text-field
                v-model.number="newIncome.amount"
                label="Kwota"
                required
                step="0.01"
                type="number"
              />
              <v-select
                v-model="newIncome.sourceId"
                :items="incomeSources"
                item-title="name"
                item-value="id"
                label="Źródło"
                required
              />
              <v-text-field
                v-model="newIncome.description"
                label="Opis"
              />
              <v-text-field
                v-model="newIncome.date"
                label="Data"
                required
                type="date"
              />
              <v-btn
                block
                class="mt-2"
                color="success"
                type="submit"
              >
                Zapisz
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- DIALOG edycji -->
    <v-dialog v-model="editDialog" max-width="480">
      <v-card>
        <v-card-title>Edycja przychodu</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="updateIncome">
            <v-text-field
              v-model.number="editedIncome.amount"
              label="Kwota"
              required
              step="0.01"
              type="number"
            />
            <v-select
              v-model="editedIncome.sourceId"
              :items="incomeSources"
              item-title="name"
              item-value="id"
              label="Źródło"
              required
            />
            <v-text-field
              v-model="editedIncome.description"
              label="Opis"
            />
            <v-text-field
              v-model="editedIncome.date"
              label="Data"
              required
              type="date"
            />
            <v-card-actions class="mt-2">
              <v-spacer/>
              <v-btn variant="text" @click="editDialog = false">Anuluj</v-btn>
              <v-btn color="success" type="submit">Zapisz</v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
import axios from 'axios'
import {onMounted, ref} from 'vue'

interface IncomeSource {
  id: string
  name: string
  color?: string
}

interface Income {
  id: string
  amount: number
  description?: string
  date: string
  sourceId: string
  createdAt?: string
  source: IncomeSource  // z include backendu
}

const incomeSources = ref<IncomeSource[]>([])
const incomes = ref<Income[]>([])

const incomeHeaders = [
  {title: 'Nazwa', key: 'description'},
  {title: 'Kwota', key: 'amount'},
  {title: 'Źródło', key: 'source'},
  {title: 'Data', key: 'date'},
  {title: 'Akcje', key: 'actions', sortable: false},
]

// formularz dodawania
const newIncome = ref<{
  amount: number | null
  description: string
  date: string
  sourceId: string | null
}>({
  amount: null,
  description: '',
  date: new Date().toISOString().slice(0, 10),
  sourceId: null,
})

// dialog edycji
const editDialog = ref(false)
const editedIncome = ref<Income | null>(null)

// helpers
function sourceColor(sourceId: string) {
  const source = incomeSources.value.find(s => s.id === sourceId)
  return source?.color || '#4caf50'
}

function getContrastTextColor(hex: string) {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#ffffff'
}

function sourceName(sourceId: string) {
  return incomeSources.value.find(s => s.id === sourceId)?.name || '–'
}

// API
async function loadIncomeSources() {
  const res = await axios.get<IncomeSource[]>('/api/v1/sources')
  incomeSources.value = res.data
}

async function loadIncomes() {
  const res = await axios.get<Income[]>('/api/v1/incomes')
  incomes.value = res.data
}

async function createIncome() {
  if (!newIncome.value.amount || !newIncome.value.sourceId) return

  const payload = {
    amount: newIncome.value.amount,
    description: newIncome.value.description || null,
    date: new Date(newIncome.value.date),
    sourceId: newIncome.value.sourceId,
  }

  const res = await axios.post<Income>('/api/v1/incomes', payload)
  incomes.value.push(res.data)

  // reset formularza
  newIncome.value.amount = null
  newIncome.value.description = ''
  newIncome.value.date = new Date().toISOString().slice(0, 10)
}

function openEditDialog(inc: Income) {
  editedIncome.value = {...inc}
  editedIncome.value.date = inc.date.slice(0, 10)
  editDialog.value = true
}

async function updateIncome() {
  if (!editedIncome.value) return

  const payload = {
    amount: editedIncome.value.amount,
    description: editedIncome.value.description || null,
    date: new Date(editedIncome.value.date),
    sourceId: editedIncome.value.sourceId,
  }

  const res = await axios.patch<Income>(
    `/api/v1/incomes/${editedIncome.value.id}`,
    payload,
  )

  const idx = incomes.value.findIndex(i => i.id === res.data.id)
  if (idx !== -1) incomes.value[idx] = res.data

  editDialog.value = false
}

async function deleteIncome(id: string) {
  await axios.delete(`/api/v1/incomes/${id}`)
  incomes.value = incomes.value.filter(i => i.id !== id)
}

onMounted(async () => {
  await Promise.all([loadIncomeSources(), loadIncomes()])
})

const months = [
  {label: 'Styczeń', value: '01'},
  {label: 'Luty', value: '02'},
  {label: 'Marzec', value: '03'},
  {label: 'Kwiecień', value: '04'},
  {label: 'Maj', value: '05'},
  {label: 'Czerwiec', value: '06'},
  {label: 'Lipiec', value: '07'},
  {label: 'Sierpień', value: '08'},
  {label: 'Wrzesień', value: '09'},
  {label: 'Październik', value: '10'},
  {label: 'Listopad', value: '11'},
  {label: 'Grudzień', value: '12'},
]

const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
const selectedMonth = ref(currentMonth)
const filteredIncomes = computed(() => {
  if (!selectedMonth.value) return incomes.value
  return incomes.value.filter(i =>
    i.date.startsWith(selectedMonth.value)
  )
})


</script>

<style scoped>
/* opcjonalne style */
</style>
