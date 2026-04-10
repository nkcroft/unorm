import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(process.cwd(), 'src/index.ts'),
      name: 'unorm',
      fileName: 'index',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        'node:stream',
        'node:fs',
        'node:path',
        'node:process',
        'commander',
        'picocolors'
      ]
    }
  }
})
