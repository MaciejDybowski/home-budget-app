<script lang="ts" setup>
import {onMounted, ref} from 'vue'
import axios from 'axios'

interface Pattern {
  id: string
  pattern: string
}

interface Category {
  id: string
  name: string
  color?: string
  patterns: Pattern[]
}

const categories = ref<Category[]>([])

const categoryDialog = ref(false)
const editingCategory = ref<Category | null>(null)

const categoryForm = ref({name: '', color: ''})
const patternText = ref('') // do edycji wszystkich patternów w dialogu

const colorMenu = ref(false)

const categoryHeaders = [
  {title: 'Nazwa', key: 'name'},
  {title: 'Kolor', key: 'color'},
  {title: 'Patterny', key: 'patterns'},
  {title: 'Akcje', key: 'actions', sortable: false},
]

async function loadCategories() {
  const res = await axios.get<Category[]>('/api/v1/categories')
  categories.value = res.data.map(cat => ({
    ...cat
  }))
}

function openCategoryDialog(cat?: Category) {
  if (cat) {
    editingCategory.value = cat
    categoryForm.value = {name: cat.name, color: cat.color || ''}
    patternText.value = cat.patterns.map(p => p.pattern).join(', ')
  } else {
    editingCategory.value = null
    categoryForm.value = {name: '', color: ''}
    patternText.value = ''
  }
  categoryDialog.value = true
}

function closeCategoryDialog() {
  categoryDialog.value = false
}

async function saveCategory() {
  const patternsArray = patternText.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (editingCategory.value) {
    // edycja kategorii
    await axios.patch(`/api/v1/categories/${editingCategory.value.id}`, categoryForm.value)

    // usuń stare patterny
    await Promise.all(editingCategory.value.patterns.map(p =>
      axios.delete(`/api/v1/categories/patterns/${p.id}`)
    ))

    // dodaj nowe patterny
    await Promise.all(patternsArray.map(p =>
      axios.post('/api/v1/categories/patterns', {
        categoryId: editingCategory.value!.id,
        pattern: p
      })
    ))
  } else {
    // dodawanie nowej kategorii
    const res = await axios.post('/api/v1/categories', categoryForm.value)
    const newCategoryId = res.data.id

    // dodaj patterny
    await Promise.all(patternsArray.map(p =>
      axios.post('/api/v1/categories/patterns', {
        categoryId: newCategoryId,
        pattern: p
      })
    ))
  }

  categoryDialog.value = false
  await loadCategories()
}

async function deleteCategory(id: string) {
  if (!confirm('Na pewno usunąć kategorię?')) return
  await axios.delete(`/api/v1/categories/${id}`)
  await loadCategories()
}

onMounted(loadCategories)
</script>

<template>
  <v-container>
    <!-- Nagłówek z przyciskiem dodawania -->
    <v-row align="center" class="mb-4">
      <v-col>
        <h2>Kategorie i patterny</h2>
      </v-col>
      <v-col class="d-flex justify-end">
        <v-btn color="primary" small @click="openCategoryDialog()">Dodaj kategorię</v-btn>
      </v-col>
    </v-row>

    <!-- Tabela kategorii -->
    <v-data-table
      :headers="categoryHeaders"
      :items="categories"
      :items-per-page="50"
      class="elevation-1"
      item-key="id"
    >

      <template #item.color="{ item }">
        <span
          :style="{ backgroundColor: item.color || '#ffffff' }"
          :title="item.color || ''"
          aria-hidden="true"
          class="table-color-swatch"
        ></span>
      </template>

      <template #item.patterns="{ item }">
        {{ item.patterns.map(p => p.pattern).join(', ') }}
      </template>

      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil"
               size="small"
               variant="text" @click="openCategoryDialog(item)"></v-btn>
        <v-btn color="error"
               icon="mdi-delete"
               size="small"
               variant="text" @click="deleteCategory(item.id)"></v-btn>
      </template>
    </v-data-table>

    <!-- Dialog dodawania/edycji kategorii z patternami -->
    <v-dialog v-model="categoryDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingCategory ? 'Edytuj kategorię' : 'Dodaj kategorię' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="categoryForm.name" density="compact" label="Nazwa"/>

          <!-- Color picker: activator pokazuje hex i swatch, picker w menu -->
          <v-menu v-model="colorMenu" close-on-content-click="false" offset-y>
            <template #activator="{ props }">
              <v-text-field
                v-model="categoryForm.color"
                density="compact"
                label="Kolor (hex)"
                readonly
                v-bind="props"
              >
                <template #append>
                  <span
                    :style="{ backgroundColor: categoryForm.color || '#ffffff' }"
                    class="color-swatch"
                  ></span>
                </template>
              </v-text-field>
            </template>

            <v-card>
              <v-color-picker
                v-model="categoryForm.color"
                flat
                hide-mode-switch
                swatches
              />
              <v-card-actions>
                <v-spacer/>
                <v-btn small text @click="colorMenu = false">Zamknij</v-btn>
              </v-card-actions>
            </v-card>
          </v-menu>

          <!-- Lista patternów jako textarea -->
          <v-textarea
            v-model="patternText"
            density="compact"
            label="Patterny (oddzielone przecinkiem)"
            rows="4"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn small text @click="closeCategoryDialog()">Anuluj</v-btn>
          <v-btn color="primary" small @click="saveCategory()">Zapisz</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
/* compact buttons i pola */
.v-btn {
  min-width: 32px;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-block;
  margin-left: 8px;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.table-color-swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.15);
  vertical-align: middle;
}
</style>
