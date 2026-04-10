import { describe, it, expect } from 'vitest'
import { NormalizeStream } from '../src/stream'
import { Readable } from 'node:stream'

describe('NormalizeStream', () => {
  it('should normalize NFD to NFC across chunks safely', async () => {
    // '한글' in NFD: ㅎ(U+1112) ㅏ(U+1161) ㄴ(U+11AB) ㄱ(U+1100) ㅡ(U+1173) ㄹ(U+11AF)
    const nfdString = '한글'.normalize('NFD')

    // Feed one jamo character per chunk to stress-test boundary handling
    const chunks = Array.from(nfdString)

    const readable = Readable.from(chunks)
    const normalizeStream = new NormalizeStream({ form: 'NFC' })

    let result = ''
    for await (const chunk of readable.pipe(normalizeStream)) {
      result += chunk.toString()
    }

    expect(result).toBe('한글')
  })

  it('should handle Buffer chunks safely without breaking UTF-8', async () => {
    const nfcString = '안녕하세요'
    const buffer = Buffer.from(nfcString, 'utf8')

    // Force a split in the middle of a UTF-8 sequence (e.g., '안' is 3 bytes, cut after 2)
    const chunk1 = buffer.subarray(0, 2)
    const chunk2 = buffer.subarray(2)

    const readable = Readable.from([chunk1, chunk2])
    const normalizeStream = new NormalizeStream({ form: 'NFC' })

    let result = ''
    for await (const chunk of readable.pipe(normalizeStream)) {
      result += chunk.toString()
    }

    expect(result).toBe('안녕하세요')
  })
})
