<template>
  <v-container>
    <h1>Wydatki</h1>

    <v-row>
      <!-- COL 9: tabela wydatków -->
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
          <v-card-title>Lista wydatków</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="expenseHeaders"
              :items="filteredExpenses"
              :items-per-page="50"
              item-key="id"
            >
              <!-- kolumna kategoria -->
              <template #item.category="{ item }">
                <v-chip
                  :style="{ backgroundColor: categoryColor(item.categoryId), color: getContrastTextColor(categoryColor(item.categoryId)) }"
                  size="small"
                >
                  {{ categoryName(item.categoryId) }}
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
                  @click="deleteExpense(item.id)"
                />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- COL 3: formularz dodawania -->
      <v-col cols="12" md="3">
        <v-card>
          <v-card-title>Nowy wydatek</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="createExpense">
              <v-text-field
                v-model.number="newExpense.amount"
                label="Kwota"
                required
                step="0.01"
                type="number"
              />
              <v-select
                v-model="newExpense.categoryId"
                :items="categories"
                item-title="name"
                item-value="id"
                label="Kategoria"
                required
              />
              <v-text-field
                v-model="newExpense.description"
                label="Opis"
              />
              <v-text-field
                v-model="newExpense.date"
                label="Data"
                required
                type="date"
              />
              <v-btn
                block
                class="mt-2"
                color="primary"
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
        <v-card-title>Edycja wydatku</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="updateExpense">
            <v-text-field
              v-model.number="editedExpense.amount"
              label="Kwota"
              required
              step="0.01"
              type="number"
            />
            <v-select
              v-model="editedExpense.categoryId"
              :items="categories"
              item-title="name"
              item-value="id"
              label="Kategoria"
              required
            />
            <v-text-field
              v-model="editedExpense.description"
              label="Opis"
            />
            <v-text-field
              v-model="editedExpense.date"
              label="Data"
              required
              type="date"
            />
            <v-card-actions class="mt-2">
              <v-spacer/>
              <v-btn variant="text" @click="editDialog = false">Anuluj</v-btn>
              <v-btn color="primary" type="submit">Zapisz</v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>


<script lang="ts" setup>
import axios from 'axios'
import {computed, onMounted, ref} from 'vue'

interface Category {
  id: string
  name: string
  color?: string
}

interface Expense {
  id: string
  amount: number
  description?: string
  date: string
  categoryId: string
  createdAt?: string
}

const categories = ref<Category[]>([])
const expenses = ref<Expense[]>([])

const expenseHeaders = [
  {title: 'Nazwa', key: 'description'},
  {title: 'Kwota', key: 'amount'},
  {title: 'Kategoria', key: 'category'},
  {title: 'Data', key: 'date'},
  {title: 'Akcje', key: 'actions', sortable: false},
]

// formularz dodawania
const newExpense = ref<{
  amount: number | null
  description: string
  date: string
  categoryId: string | null
}>({
  amount: null,
  description: '',
  date: new Date().toISOString().slice(0, 10),
  categoryId: null,
})

// dialog edycji
const editDialog = ref(false)
const editedExpense = ref<Expense | null>(null)

// helpers
function categoryColor(categoryId: string) {
  const cat = categories.value.find(c => c.id === categoryId)
  return cat?.color || '#cccccc'
}

function getContrastTextColor(hex: string) {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#ffffff'
}

function categoryName(categoryId: string) {
  return categories.value.find(c => c.id === categoryId)?.name || '–'
}

// API
async function loadCategories() {
  const res = await axios.get<Category[]>('/api/v1/categories')
  categories.value = res.data
}

async function loadExpenses() {
  const res = await axios.get<Expense[]>('/api/v1/expenses')
  expenses.value = res.data
}

async function createExpense() {
  if (!newExpense.value.amount || !newExpense.value.categoryId) return

  const payload = {
    amount: newExpense.value.amount,
    description: newExpense.value.description || null,
    date: new Date(newExpense.value.date),
    categoryId: newExpense.value.categoryId,
  }

  const res = await axios.post<Expense>('/api/v1/expenses', payload)
  expenses.value.push(res.data)

  // reset formularza
  newExpense.value.amount = null
  newExpense.value.description = ''
  newExpense.value.date = new Date().toISOString().slice(0, 10)
}

function openEditDialog(exp: Expense) {
  editedExpense.value = {...exp}
  // date -> yyyy-MM-dd
  editedExpense.value.date = exp.date.slice(0, 10)
  editDialog.value = true
}

async function updateExpense() {
  if (!editedExpense.value) return

  const payload = {
    amount: editedExpense.value.amount,
    description: editedExpense.value.description || null,
    date: new Date(editedExpense.value.date),
    categoryId: editedExpense.value.categoryId,
  }

  const res = await axios.patch<Expense>(
    `/api/v1/expenses/${editedExpense.value.id}`,
    payload,
  )

  const idx = expenses.value.findIndex(e => e.id === res.data.id)
  if (idx !== -1) expenses.value[idx] = res.data

  editDialog.value = false
}

async function deleteExpense(id: string) {
  await axios.delete(`/api/v1/expenses/${id}`)
  expenses.value = expenses.value.filter(e => e.id !== id)
}

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

const filteredExpenses = computed(() => {
  if (!selectedMonth.value) return expenses.value
  return expenses.value.filter(e =>
    e.date.startsWith(selectedMonth.value)
  )
})


onMounted(async () => {
  await Promise.all([loadCategories(), loadExpenses()])
})
</script>


<style scoped>

</style>
