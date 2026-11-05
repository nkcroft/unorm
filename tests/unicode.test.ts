import { describe, it, expect } from 'vitest'
import {
  countCodePoints,
  countGraphemes,
  detectForm,
  findSafeSplitIndex,
  parseForm,
  toCodepoints,
  toEscaped
} from '../src/unicode'

const NAME_NFC = '홍길동'.normalize('NFC')
const NAME_NFD = '홍길동'.normalize('NFD')

describe('countGraphemes', () => {
  it('counts NFD Hangul as user-perceived characters', () => {
    expect(countCodePoints(NAME_NFD)).toBe(9)
    expect(countGraphemes(NAME_NFD)).toBe(3)
    expect(countGraphemes(NAME_NFC)).toBe(3)
  })

  it('counts base + combining mark as one glyph', () => {
    expect(countGraphemes('é')).toBe(1)
  })
})

describe('detectForm', () => {
  it('detects NFC and NFD Hangul', () => {
    expect(detectForm(NAME_NFC)).toBe('NFC')
    expect(detectForm(NAME_NFD)).toBe('NFD')
  })

  it('reports strings unaffected by normalization as NFC=NFD', () => {
    expect(detectForm('abc')).toBe('NFC=NFD')
    expect(detectForm('')).toBe('NFC=NFD')
  })

  it('reports partially decomposed strings as MIXED', () => {
    expect(detectForm('한' + '글'.normalize('NFD') + 'ﬁ')).toBe('MIXED')
  })
})

describe('parseForm', () => {
  it('accepts supported forms case-insensitively', () => {
    expect(parseForm('nfc')).toBe('NFC')
    expect(parseForm('NfKd')).toBe('NFKD')
  })

  it('rejects unsupported values', () => {
    expect(parseForm('foo')).toBeUndefined()
    expect(parseForm(undefined)).toBeUndefined()
  })
})

describe('findSafeSplitIndex', () => {
  it('holds back the last starter so following marks can compose with it', () => {
    expect(findSafeSplitIndex('abce')).toBe(3)
    expect(findSafeSplitIndex('ab가')).toBe(2)
  })

  it('holds back a starter together with its trailing jamo or marks', () => {
    const nfd = '한'.normalize('NFD')
    expect(findSafeSplitIndex('x' + nfd)).toBe(1)
    expect(findSafeSplitIndex('xé')).toBe(1)
  })

  it('holds back everything when only non-starters are present', () => {
    expect(findSafeSplitIndex('́̂')).toBe(0)
  })

  it('emits everything when the chunk ends with a newline', () => {
    expect(findSafeSplitIndex('abc\n')).toBe(4)
  })

  it('steps over supplementary-plane combining marks', () => {
    // U+1D165 MUSICAL SYMBOL COMBINING STEM is a surrogate pair
    expect(findSafeSplitIndex('ab\u{1D165}')).toBe(1)
  })
})

describe('toEscaped / toCodepoints', () => {
  it('escapes and brackets decomposed characters only', () => {
    expect(toEscaped('A' + '가'.normalize('NFD'))).toBe('A\\u1100\\u1161')
    expect(toCodepoints('A' + '가'.normalize('NFD'))).toBe('U+0041 [U+1100] [U+1161]')
  })
})
