// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-30',
  // Statically prerendered single-page app (nuxt generate).
  ssr: true,

  // Tailwind v4 is wired through its first-party Vite plugin.
  vite: {
    plugins: [tailwindcss()]
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'CDO Jeepney Routes',
      meta: [
        { charset: 'UTF-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        {
          name: 'description',
          content:
            'Cagayan de Oro LPTRP jeepney route reference map using local route data.'
        },
        { name: 'theme-color', content: '#9a6a06' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  },

  // Atomic Design: components live in atoms/molecules/organisms/templates
  // subfolders but are referenced by bare filename (no directory prefix).
  components: [{ path: '~/components', pathPrefix: false }],

  // Self-hosted Inter Variable, Leaflet's own styles, then the Tailwind entry
  // (engine + quark tokens + Leaflet glue). The UI itself is utility classes.
  css: ['leaflet/dist/leaflet.css', '~/assets/css/tailwind.css'],

  nitro: {
    // Prerender the single page to static HTML for GitHub Pages.
    prerender: {
      crawlLinks: true,
      routes: ['/']
    }
  }
})
