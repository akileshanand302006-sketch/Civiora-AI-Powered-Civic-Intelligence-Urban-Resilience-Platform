import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@civicpulse/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Make design tokens available in every SCSS file
        additionalData: `@use "@/design-system/css/_tokens" as *;\n`,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          map: ['@googlemaps/js-api-loader'],
          ui: ['bootstrap', 'framer-motion', 'animejs'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
