<template>
  <v-container>
    <!-- 1. Upload CSV -->
    <v-card class="mb-4">
      <v-card-title>Import z CSV (tylko dla ING)</v-card-title>
      <v-card-text>
        <v-file-input
          v-model="file"
          :multiple="false"
          accept=".csv,text/csv"
          label="Plik CSV"
          prepend-icon="mdi-file-delimited"
          show-size
          @change="onFileChange"
        />
      </v-card-text>
    </v-card>

    <!-- 2. Podgląd i dopasowanie do expenses -->
    <v-card v-if="rows.length">
      <v-card-title class="d-flex align-center">
        Zaimportowane wiersze
        <v-spacer/>
        <span class="text-caption">{{ rows.length }} pozycji</span>
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="tableHeaders"
          :items="rows"
          :items-per-page="10"
          class="elevation-1"
          item-key="id"
        >
          <!-- Data transakcji -> date -->
          <template #item.date="{ item }">
            <v-text-field
              v-model="item.date"
              density="compact"
              hide-details
              style="min-width: 160px"
              type="date"
            />
          </template>

          <!-- Kwota -> amount -->
          <template #item.amount="{ item }">
            <v-text-field
              v-model.number="item.amount"
              density="compact"
              hide-details
              style="min-width: 90px"
              type="number"
            />
          </template>

          <!-- Tytuł przelewu / opis -->

          <template #item.description="{ item }">
            <v-text-field
              v-model="item.description"
              density="compact"
              hide-details
              style="min-width: 200px"
            />
          </template>


          <!-- Kategoria (select) -->
          <template #item.categoryId="{ item }">
            <v-select
              v-model="item.categoryId"
              :items="categories"
              density="compact"
              hide-details
              item-title="name"
              item-value="id"
              style="min-width: 160px"
            />
          </template>

          <!-- Oryginalny tytuł (read-only, z CSV) -->
          <template #item.rawTitle="{ item }">
            <span class="text-caption">
              {{ item.rawTitle }}
            </span>
          </template>

          <template #item.isGrouped="{ item }">
            <v-chip
              v-if="item.isGrouped"
              color="primary"
              label
              small
            >
              Grupowane
            </v-chip>
          </template>


          <!-- Akcje -->
          <template #item.actions="{ item }">
            <v-btn
              color="error"
              icon="mdi-delete"
              size="small"
              variant="text"
              @click="removeRow(item.id)"
            />
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn
          :disabled="!canSubmit"
          color="primary"
          @click="submitAll"
        >
          Załaduj do wydatków ({{ rows.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import axios from 'axios'
import Papa from 'papaparse'

interface Category {
  id: string
  name: string
  color?: string
}

interface BatchRow {
  id: number
  rawDate: string
  rawBookingDate: string
  rawCounterparty: string
  rawTitle: string
  rawAccount: string
  rawBankName: string
  rawDetails: string
  rawTransactionId: string
  rawAmount: string
  rawCurrency: string

  // zmapowane na CreateExpenseDto
  date: string        // yyyy-MM-dd
  amount: number
  description: string
  categoryId: string | null
}

const file = ref<File | null>(null)
const rows = ref<BatchRow[]>([])


interface CategoryWithPatterns extends Category {
  patterns: { id: string, pattern: string }[]
}

const categories = ref<CategoryWithPatterns[]>([])
const patternsMap = ref<Record<string, string[]>>({})

async function loadCategories() {
  const res = await axios.get<CategoryWithPatterns[]>('/api/v1/categories')

  // jeśli backend zwraca CategoryPattern
  categories.value = res.data.map(cat => ({
    ...cat,
    patterns: cat.patterns || [], // przemapuj na 'patterns'
  }))

  // tworzymy mapę do szybkiego dopasowania
  patternsMap.value = {}
  categories.value.forEach(cat => {
    patternsMap.value[cat.id] = cat.patterns.map(p => p.pattern)
  })
}


function guessCategoryId(title: string): string | null {
  if (!title) return null
  const normalized = title.toLowerCase()
  for (const [catId, patterns] of Object.entries(patternsMap.value)) {
    if (patterns.some(p => normalized.includes(p.toLowerCase()))) {
      return catId
    }
  }
  return null
}


// Nagłówki tabeli
const tableHeaders = [
  {title: 'Tytuł z CSV', key: 'rawTitle'},
  {title: 'Opis (NASZ)', key: 'description', cellProps: {width: "150px"}},
  {title: 'Kategoria', key: 'categoryId'},
  {title: 'Kwota', key: 'amount'},
  {title: 'Data', key: 'date'},
  {title: 'Grupowane', key: 'isGrouped'},
  {title: 'Akcje', key: 'actions', sortable: false},
]


function onFileChange() {
  if (!file.value) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (!text) return

    // znajdź wiersz z właściwym nagłówkiem
    const lines = text.split(/\r?\n/)
    const headerIndex = lines.findIndex(line => line.trim().startsWith('Data transakcji;') || line.trim().startsWith('"Data transakcji";'))
    if (headerIndex === -1) {
      console.error('Nie znaleziono nagłówka CSV!')
      return
    }

    const csvText = lines.slice(headerIndex).join('\n')

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
      transformHeader: h => h.trim().toLowerCase(),
      complete: (result) => {
        const data = result.data as Record<string, string>[]

        // parsowanie i normalizacja
        let parsedRows: BatchRow[] = data.map((row, index) => {
          const normalizedRow: Record<string, string> = {}
          Object.entries(row).forEach(([k, v]) => {
            const key = k ? k.toString().trim().toLowerCase() : ''
            const value = v != null ? v.toString().trim() : ''
            normalizedRow[key] = value
          })

          const rawDate = normalizedRow['data transakcji'] || ''
          const rawAmount = normalizedRow['kwota transakcji (waluta rachunku)'] || ''
          const rawTitleCombined = [
            normalizedRow['dane kontrahenta']?.trim(),
            normalizedRow['tytuł']?.trim().replace(/^'+|'+$/g, '') // usuwa apostrofy
          ].filter(Boolean).join(' | ')
          const parsedDate = parseCsvDate(rawDate)
          const amount = parseAmount(rawAmount)
          const guessedCategoryId = guessCategoryId(rawTitleCombined)

          return {
            id: index,
            rawDate,
            rawBookingDate: normalizedRow['data księgowania'] || '',
            rawCounterparty: normalizedRow['dane kontrahenta'] || '',
            rawTitle: rawTitleCombined,
            rawAccount: normalizedRow['nr rachunku'] || '',
            rawBankName: normalizedRow['nazwa banku'] || '',
            rawDetails: normalizedRow['szczegóły'] || '',
            rawTransactionId: normalizedRow['nr transakcji'] || '',
            rawAmount,
            rawCurrency: normalizedRow['waluta'] || '',

            date: parsedDate,
            amount,
            description: buildDescription(normalizedRow),
            categoryId: guessedCategoryId,
            isGrouped: false,
          } as BatchRow
        })

        // 🔹 odfiltrowanie dodatnich i przemnożenie ujemnych na dodatnie
        parsedRows = parsedRows
          .filter(r => r.amount < 0)
          .map(r => ({...r, amount: r.amount * -1}))

        // 🔹 grupowanie po odbiorcy
        const groupedMap = new Map<string, BatchRow>()
        parsedRows.forEach(row => {
          const key = row.rawCounterparty.trim()
          if (!key) return // brak odbiorcy → pomijamy grupowanie

          if (!groupedMap.has(key)) {
            groupedMap.set(key, {...row, isGrouped: false})
          } else {
            const existing = groupedMap.get(key)!
            existing.amount += row.amount
            existing.rawTitle = row.rawTitle       // ostatnia transakcja
            existing.date = row.date               // ostatnia data
            existing.isGrouped = true
          }
        })

        // 🔹 finalny array do tabeli
        rows.value = Array.from(groupedMap.values())
      }
    })
  }
  reader.readAsText(file.value)
}


// buildDescription: usuwa spacje i apostrofy z początku/końca tytułu
function buildDescription(row: Record<string, string>): string {
  const parts = [
    row['tytuł']?.trim().replace(/^'+|'+$/g, ''),
    row['dane kontrahenta']?.trim(),
    row['szczegóły']?.trim()
  ].filter(Boolean)
  return parts.join(' | ')
}

// parseAmount: usuwa spacje, przecinki, apostrofy
function parseAmount(value: string): number {
  if (!value) return 0
  const normalized = value.replace(/\s/g, '').replace(',', '.').replace(/'/g, '')
  const n = Number(normalized)
  return isNaN(n) ? 0 : n
}

// parseCsvDate: dd.MM.yyyy lub yyyy-MM-dd
function parseCsvDate(value: string): string {
  if (!value) return new Date().toISOString().slice(0, 10)

  const dotParts = value.split('.')
  if (dotParts.length === 3) {
    const [d, m, y] = dotParts
    const iso = new Date(Number(y), Number(m) - 1, Number(d))
    return iso.toISOString().slice(0, 10)
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)

  const d = new Date(value)
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}


// Możliwość usuwania wiersza z tabeli
function removeRow(id: number) {
  rows.value = rows.value.filter(r => r.id !== id)
}

// Czy wszystkie wiersze są gotowe do wysyłki
const canSubmit = computed(() =>
  rows.value.length > 0 &&
  rows.value.every(r => r.amount !== 0 && !!r.date && !!r.categoryId)
)

// Wysłanie batcha – wersja 1: wiele POST /expenses
async function submitAll() {
  if (!canSubmit.value) return

  const payloads = rows.value.map(r => ({
    amount: r.amount,
    description: r.description,
    date: new Date(r.date),
    categoryId: r.categoryId!,
  }))

  // prosty wariant: wiele równoległych zapytań POST
  await Promise.all(
    payloads.map(p => axios.post('/api/v1/expenses', p))
  )

  // po sukcesie wyczyść tabelę
  rows.value = []
  file.value = null
}

// inicjalne pobranie kategorii
loadCategories()
</script>

<style scoped>
/* ewentualne dopasowanie wyglądu */
</style>
