import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { normalizeString } from '../src/normalize'

describe('mac_nfd_data.txt fixture', () => {
  it('contains NFD sequences and normalizes to stable NFC', () => {
    const path = resolve(import.meta.dirname, 'mac_nfd_data.txt')
    const raw = readFileSync(path, 'utf8')
    expect(raw).not.toBe(raw.normalize('NFC'))
    const nfc = normalizeString(raw, 'NFC')
    expect(nfc).toBe(nfc.normalize('NFC'))
  })
})
