#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { runCli } = await import(path.join(__dirname, '../dist/cli.js'))
runCli()
