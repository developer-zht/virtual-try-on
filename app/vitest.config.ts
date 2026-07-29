import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  envPrefix: ['VITE_', 'API_', 'TEST_'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)), // 让 @ = src
      // '@': './src', // 让 @ = src
    },
  },
  plugins: [vue()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'source',
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/tests/component/**/*.spec.ts'],
          environment: 'node', // 集成测试打真实后端，node 够用；要 localStorage/window 就换 'jsdom'
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          include: ['src/**/tests/component/**/*.spec.ts'],
          environment: 'happy-dom',
        },
      },
    ],
  },
});
