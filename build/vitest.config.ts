import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, '../'),
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [resolve(__dirname, './setup-env.ts')],
    include: ['test/**/*.spec.ts']
  }
})
