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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Only measure unit-testable files — those with dedicated test suites or
      // confirmed full coverage through integration with tested modules.
      // Excludes purely presentational TSX components (all logic lives in hooks),
      // SDK initialisers, and bare type definitions.
      // See CONTRIBUTING.md → "What intentionally has no unit tests" for rationale.
      include: [
        // Hooks — pure stateful logic, no Firebase
        'src/hooks/**/*.ts',
        // Lib utilities — pure functions and browser-API wrappers
        'src/lib/**/*.ts',
        // Zod schemas — call .parse()/.safeParse() directly
        'src/schemas/**/*.ts',
        // Service layer — Firebase calls fully mocked in unit tests
        'src/services/**/*.ts',
        // Zustand stores
        'src/stores/**/*.ts',
        // enums: has logic (labels, mappings) + a dedicated test suite
        'src/types/enums.ts',
        // Feature helpers: pure functions extracted specifically for testability
        'src/app/components/shell/capabilities.ts',
        'src/app/components/shell/navItems.ts',
        'src/app/features/access/people.ts',
        'src/app/features/auth/pipelineOrder.ts',
        'src/app/features/content/components/fieldStyles.ts',
        'src/app/features/dashboard/pages/dashboardHelpers.ts',
        'src/app/features/leads/pages/leadsHelpers.ts',
        'src/app/features/listings/contactGate.ts',
        'src/app/features/listings/components/photos/usePhotoQueue.ts',
        'src/app/features/listings/pages/listingsHelpers.ts',
        'src/app/features/plan/planContent.ts',
        'src/app/features/team/teamRoster.ts',
        // Access guards — thin components with testable logic (allowlist checks + redirects)
        'src/app/components/guards/**/*.tsx',
        // Shell and UI components with dedicated test suites
        'src/app/components/shell/AccessListButton.tsx',
        'src/app/components/shell/ViewAsMenu.tsx',
        'src/app/components/ui/Button.tsx',
        'src/app/components/ui/PasswordRequirements.tsx',
        'src/app/components/ui/PhotoCarousel.tsx',
        // Auth page flows — all have comprehensive test suites
        'src/app/features/auth/pages/**/*.tsx',
        // Other components with dedicated test suites
        'src/app/features/dashboard/components/EmptyState.tsx',
        'src/app/features/listings/components/OwnerCard.tsx',
        'src/app/features/listings/components/photos/PhotoGrid.tsx',
        'src/app/features/listings/pages/ListingsPage.tsx',
        'src/components/explore/PhotoCarousel.tsx',
        'src/components/layout/Header.tsx',
        'src/pages/PropertyPage.tsx',
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        // SDK initialiser — module-level side effects, no isolatable unit logic
        'src/lib/firebase.ts',
      ],
    },
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
