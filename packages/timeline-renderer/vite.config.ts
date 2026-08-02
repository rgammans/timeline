import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({ rollupTypes: true })
  ],
  build: {
    lib: {
      entry: resolve(import.meta.dirname!, 'src/index.ts'),
      name: 'TimelineRenderer',
      fileName: 'index',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['@timeline/core', 'dayjs']
    }
  },
  test: {
    environment: 'jsdom'
  }
});
