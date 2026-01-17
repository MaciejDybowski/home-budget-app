<template>
  <v-app>
    <!-- APP BAR -->
    <v-app-bar app color="primary" dark density="comfortable">
      <v-app-bar-nav-icon v-if="mobile" @click="drawer = !drawer"/>
      <v-app-bar-title>Dybowscy budget App</v-app-bar-title>
    </v-app-bar>

    <!-- NAVIGATION DRAWER -->
    <v-navigation-drawer v-model="drawer" :permanent="!mobile" :temporary="mobile" app>
      <v-list density="compact" nav>
        <NavItem
          v-for="page in pages"
          :key="page.route"
          :icon="page.icon"
          :label="page.label"
          :to="page.route"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- MAIN CONTENT -->
    <v-main>
      <router-view/>
    </v-main>

    <!-- BOTTOM NAVIGATION -->
    <v-bottom-navigation v-if="mobile" app grow>
      <v-btn v-for="page in pages" :key="page.route" :to="page.route">
        <v-icon>{{ page.icon }}</v-icon>
        {{ page.labelShort }}
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<script lang="ts" setup>
import {ref, watch} from 'vue'
import {useDisplay} from 'vuetify'
import NavItem from '@/components/NavItem.vue'
import {Routes} from '@/router/routes'

interface NavPage {
  route: string
  label: string
  labelShort: string
  icon: string
}

// ENUM / KONFIGURACJA STRON
const pages: NavPage[] = [
  {
    route: Routes.EXPENSES_DASHBOARD,
    label: 'Wydatki',
    labelShort: 'Wydatki',
    icon: 'mdi-view-dashboard',
  },
  {
    route: Routes.INCOMES_DASHBOARD,
    label: 'Przychody',
    labelShort: 'Przychody',
    icon: 'mdi-view-dashboard',
  },
  {
    route: Routes.EXPENSES,
    label: 'Zarządzanie wydatkami',
    labelShort: 'Wydatki',
    icon: 'mdi-minus-circle',
  },

  {
    route: Routes.INCOMES,
    label: 'Zarządzanie przychodami',
    labelShort: 'Przychody',
    icon: 'mdi-plus-circle',
  },
  {
    route: Routes.BATCH_EXPENSES,
    label: 'Wsadowe ładowanie wydatków',
    labelShort: 'Wsadowy import',
    icon: 'mdi-file-outline',
  },
  {
    route: Routes.CATEGORIES,
    label: 'Kategorie wydatków',
    labelShort: 'Kategorie wydatków',
    icon: 'mdi-home',
  },
  {
    route: Routes.METERS,
    label: 'Liczniki',
    labelShort: 'Liczniki',
    icon: 'mdi-counter',
  },
]

// DRAWER
const drawer = ref(true)
const {mobile} = useDisplay()

watch(mobile, (isMobile) => {
  drawer.value = !isMobile
})
</script>
