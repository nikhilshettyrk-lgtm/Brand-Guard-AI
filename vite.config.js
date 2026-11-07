import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
dotenv.config();
import { brandGuardApiPlugin } from './server/vitePluginApi.js';

export default defineConfig({
  plugins: [
    react(),
    brandGuardApiPlugin()
  ],
  server: {
    port: 3000,
    host: true
  },
  preview: {
    port: 3000,
    host: true
  }
});
