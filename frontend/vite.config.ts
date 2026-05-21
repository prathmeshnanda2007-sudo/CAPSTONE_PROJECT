import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Code-split vendor chunks for better caching
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts'))       return 'charts';
            if (id.includes('@tanstack'))      return 'query';
            if (id.includes('lucide-react'))   return 'icons';
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/')) return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
