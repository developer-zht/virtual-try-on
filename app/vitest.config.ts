import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  envPrefix: ['VITE_', 'API_', 'TEST_'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)), // 让 @ = src
      // '@': './src', // 让 @ = src
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node', // 集成测试打真实后端，node 够用；要 localStorage/window 就换 'jsdom'
  },
});
