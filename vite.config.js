import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl() // Enable HTTPS for WebXR (required for AR features)
  ],
  server: {
    https: true,
    host: true, // Allow access from network (for Android testing)
    port: 5173
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'physics': ['cannon-es']
        }
      }
    }
  }
});
