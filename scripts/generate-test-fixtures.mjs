#!/usr/bin/env node
/**
 * Writes tests/mac_nfd_data.txt with guaranteed NFD bytes (avoids editor NFC on save).
 * Run: node scripts/generate-test-fixtures.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const out = join(root, 'tests', 'mac_nfd_data.txt')

mkdirSync(dirname(out), { recursive: true })

const lines = [
  '한글'.normalize('NFD') + ' — Hangul syllables in NFD (typical macOS-style decomposition)',
  'café'.normalize('NFD') + ' — Latin with combining acute (NFD)',
  'Plain ASCII line for mixed content.'
]

writeFileSync(out, lines.join('\n') + '\n', 'utf8')
console.log('Wrote', out)
