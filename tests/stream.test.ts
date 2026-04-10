import { describe, it, expect } from 'vitest'
import { NormalizeStream } from '../src/stream'
import { Readable } from 'node:stream'

describe('NormalizeStream', () => {
  it('should normalize NFD to NFC across chunks safely', async () => {
    // '한글'을 NFD로 변환: ㅎ(U+1112) ㅏ(U+1161) ㄴ(U+11AB) ㄱ(U+1100) ㅡ(U+1173) ㄹ(U+11AF)
    const nfdString = '한글'.normalize('NFD')
    
    // 스트림에 1글자(자모 1개)씩 청크로 쪼개서 넣음
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
    
    // UTF-8 바이트를 강제로 중간에 자름 (예: '안'은 3바이트인데 2바이트에서 자름)
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
