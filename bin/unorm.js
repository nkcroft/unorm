#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const distCli = path.join(__dirname, '../dist/cli.js')

if (fs.existsSync(distCli)) {
  const { runCli } = await import(distCli)
  runCli()
} else {
  // 개발 환경 (jiti 사용)
  try {
    const { createJiti } = await import('jiti')
    const jiti = createJiti(__filename)
    const { runCli } = await jiti.import('../src/cli.ts')
    runCli()
  } catch (err) {
    console.error('Failed to run unorm CLI. Did you run `npm run build`?')
    console.error(err)
    process.exit(1)
  }
}
