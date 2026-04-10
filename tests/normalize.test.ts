import { describe, it, expect } from 'vitest'
import { normalizeString } from '../src/normalize'

describe('normalizeString', () => {
  it('should normalize NFD (macOS Korean) to NFC', () => {
    // Produce a guaranteed NFD string programmatically to avoid editor normalization
    const nfdString = '한글'.normalize('NFD')
    const nfcString = '한글'.normalize('NFC')

    expect(normalizeString(nfdString, 'NFC')).toBe(nfcString)
  })

  it('should normalize NFC to NFD', () => {
    const nfcString = '한글'.normalize('NFC')
    const nfdString = '한글'.normalize('NFD')

    expect(normalizeString(nfcString, 'NFD')).toBe(nfdString)
  })

  it('should use NFC as default form', () => {
    const nfdString = '한글'.normalize('NFD')
    const nfcString = '한글'.normalize('NFC')

    expect(normalizeString(nfdString)).toBe(nfcString)
  })
})
