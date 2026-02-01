
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Expose env variables starting with VITE_ (default) AND CHIP_
  envPrefix: ['VITE_', 'CHIP_'], 
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
