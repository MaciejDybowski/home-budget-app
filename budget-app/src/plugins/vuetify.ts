import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'
import { pl } from 'vuetify/locale';
import 'vuetify/styles'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
  },
  locale: {
    locale: 'pl',
    fallback: 'pl',
    messages: { pl },
  },
})
