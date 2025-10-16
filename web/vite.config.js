import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 8080
  },
  preview: {
    host: '0.0.0.0',
    port: 8080
  },
  resolve: {
    alias: {
      os: path.resolve(__dirname, 'src/shims/os-browser.js')
    }
  },
  define: {
    'process.env': {}
  }
});
