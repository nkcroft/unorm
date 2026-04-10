import { describe, it, expect } from 'vitest'
import { normalizeString } from '../src/normalize'

describe('normalizeString', () => {
  it('should normalize NFD (macOS Korean) to NFC', () => {
    // 자소 분리된 NFD 형태의 '한글' (Mac에서 주로 생성되는 형태)
    const nfdString = '한글' // NFD로 분리된 문자열
    // 정상적인 NFC 형태의 '한글'
    const nfcString = '한글'
    
    expect(normalizeString(nfdString, 'NFC')).toBe(nfcString)
  })

  it('should normalize NFC to NFD', () => {
    const nfcString = '한글'
    const nfdString = '한글'
    
    expect(normalizeString(nfcString, 'NFD')).toBe(nfdString)
  })

  it('should use NFC as default form', () => {
    const nfdString = '한글'
    const nfcString = '한글'
    
    expect(normalizeString(nfdString)).toBe(nfcString)
  })
})
