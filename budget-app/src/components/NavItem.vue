<template>
  <v-list-item :prepend-icon="icon ? icon: null" :to="to" link>
    <v-list-item-title>{{ label }}</v-list-item-title>
  </v-list-item>
</template>

<script lang="ts" setup>
defineProps<{
  to: string
  label: string
  icon?: string
}>()
</script>
