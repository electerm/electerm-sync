import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, '../src/electerm-sync.ts'),
      name: 'electermSync',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'esm/electerm-sync.mjs'
        if (format === 'cjs') return 'cjs/electerm-sync.js'
        return `electerm-sync.${format}.js`
      }
    },
    rollupOptions: {
      external: ['axios', 'jsonwebtoken']
    }
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    })
  ]
})
