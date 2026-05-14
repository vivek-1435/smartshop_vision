import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split TF.js into its own chunk (~2MB) so app shell loads fast
          tensorflow: ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgl'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'axios'],
          pdf: ['jspdf', 'html2canvas'],
        },
      },
    },
    chunkSizeWarningLimit: 3000,
  },
  optimizeDeps: {
    include: ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgl'],
  },
});
