import { defineConfig } from 'vite'
import { resolve } from 'path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

export default defineConfig({
  define: {
    __PKG_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    lib: {
      entry: {
        index: resolve(process.cwd(), 'src/index.ts'),
        cli: resolve(process.cwd(), 'src/cli.ts')
      },
      name: 'unorm',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        'node:stream',
        'node:fs',
        'node:path',
        'node:process',
        'node:child_process',
        'node:string_decoder',
        'commander',
        'picocolors'
      ]
    }
  }
})
