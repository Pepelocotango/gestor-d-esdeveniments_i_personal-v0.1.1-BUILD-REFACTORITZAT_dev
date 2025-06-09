const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Escaneja els paquets de FullCalendar per a les classes fc-*
    "./node_modules/@fullcalendar/**/*.js",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Pots afegir colors personalitzats aquí si vols
    },
  },
  plugins: [
    plugin(function({ addBase, addComponents, theme }) {
      addBase({
        // Estils per als esdeveniments que s'apliquen sempre
        '.event-complete': {
          backgroundColor: theme('colors.green.500'),
          borderColor: theme('colors.green.600'),
          color: theme('colors.white'),
        },
        '.event-incomplete': {
          backgroundColor: theme('colors.blue.500'),
          borderColor: theme('colors.blue.600'),
          color: theme('colors.white'),
        },

        // Estils específics per al TEMA FOSC
        '.dark .fc': {
          // Variables generals per a vistes que les respecten (com Agenda)
          '--fc-border-color': theme('colors.gray.600'),
          '--fc-today-bg-color': 'rgba(74, 222, 128, 0.15)', // Verd subtil
          
          // Botons de la capçalera (prev, next, today, etc.)
          '.fc-button': {
            backgroundColor: theme('colors.gray.700'),
            color: theme('colors.gray.200'),
            borderColor: theme('colors.gray.600'),
          },
          '.fc-button:hover': {
            backgroundColor: theme('colors.gray.600'),
          },
          '.fc-button-primary:not(:disabled).fc-button-active': {
            backgroundColor: theme('colors.blue.600'),
            borderColor: theme('colors.blue.600'),
          },

          // Capçaleres dels dies (dl, dt, etc.)
          '.fc-col-header-cell-cushion': {
            color: theme('colors.gray.300'),
            textDecoration: 'none',
          },

          // Números dels dies
          '.fc-daygrid-day-number': {
            color: theme('colors.gray.300'),
            textDecoration: 'none',
          },
          
          // Vista de llista
          '.fc-list-event-title a': {
            color: theme('colors.gray.200'),
          },
          '.fc-list-table': {
            color: theme('colors.gray.300'),
          },

          // === CORRECCIÓ ESPECÍFICA PER A MULTIMONTH ===
          // Fons de cada sub-calendari
          '.fc-multimonth-month': {
             backgroundColor: theme('colors.gray.800'),
          },
          // Fons de les cel·les dels dies
          '.fc-daygrid-day': {
             backgroundColor: theme('colors.gray.700'),
          },
          // Títol del mes (juny, juliol...)
          '.fc-multimonth-title': {
            color: theme('colors.gray.100'),
          },
        },
      });
    })
  ],
}
