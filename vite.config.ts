/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Bundle analyzer — opt-in via ANALYZE=1 npm run build to avoid emitting
    // stats files in CI / production deploys.
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: 'dist/stats.html',
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
  server: {
    proxy: {
      '/__storage': {
        target: 'https://firebasestorage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__storage/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined

          // Route umbrella `firebase` package wrappers into the same chunk as
          // their underlying `@firebase/*` package — otherwise the wrapper
          // (in `firebase` chunk) imports the impl (in `firebase-firestore`)
          // while the impl imports `@firebase/util` (back in `firebase`),
          // creating a circular chunk graph rollup warns about.
          const fbWrapper = id.match(/[\\/]node_modules[\\/]firebase[\\/]([^\\/]+)[\\/]/)
          if (fbWrapper) {
            const sub = fbWrapper[1]
            if (sub === 'firestore') return 'firebase-firestore'
            if (sub === 'auth') return 'firebase-auth'
            return 'firebase'
          }

          const m = id.match(/[\\/]node_modules[\\/](@[^\\/]+\/[^\\/]+|[^\\/]+)/)
          const pkg = m?.[1]
          if (!pkg) return undefined

          // Split firebase: firestore is the largest contributor, auth next.
          // webchannel-wrapper is only used by firestore.
          if (pkg === '@firebase/firestore' || pkg === '@firebase/webchannel-wrapper') return 'firebase-firestore'
          if (pkg === '@firebase/auth') return 'firebase-auth'
          if (pkg.startsWith('@firebase/') || pkg === 'firebase' || pkg === 'idb') return 'firebase'

          // Animation (framer-motion pulls in motion-dom which dominates the chunk).
          if (pkg === 'framer-motion' || pkg.startsWith('motion-') || pkg === 'motion') return 'motion'

          // React core + router.
          if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler' || pkg.startsWith('react-router')) return 'react-vendor'

          // Form stack.
          if (pkg === 'zod' || pkg === 'react-hook-form' || pkg === '@hookform/resolvers') return 'forms'

          // Drag-and-drop.
          if (pkg.startsWith('@dnd-kit/')) return 'dnd'

          // Data fetching.
          if (pkg.startsWith('@tanstack/')) return 'query'

          // Maps + clustering deps used only by map view.
          if (pkg === '@vis.gl/react-google-maps' || pkg.startsWith('@googlemaps/') || pkg === 'supercluster' || pkg === 'fast-equals' || pkg === 'kdbush') return 'maps'

          // Stripe.
          if (pkg.startsWith('@stripe/')) return 'stripe'

          // Icons + toasts.
          if (pkg === 'lucide-react' || pkg === 'sonner') return 'ui'

          // Image processing.
          if (pkg === 'browser-image-compression' || pkg === 'blurhash') return 'image'

          // Charts (only loaded by the internal /numbers dashboard).
          if (pkg === 'recharts' || pkg.startsWith('d3-') || pkg === 'd3' || pkg === 'victory-vendor' || pkg === 'recharts-scale') return 'charts'

          return 'vendor'
        },
      },
    },
  },
})
