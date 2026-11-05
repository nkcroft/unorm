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

async function normalizeChunks (chunks: Array<string | Buffer>, form: 'NFC' | 'NFD' = 'NFC'): Promise<string> {
  const stream = new NormalizeStream({ form })
  const out: string[] = []
  stream.on('data', (c: Buffer) => out.push(c.toString()))
  const done = new Promise<void>((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  for (const chunk of chunks) stream.write(chunk)
  stream.end()
  await done
  return out.join('')
}

describe('NormalizeStream chunk boundaries', () => {
  it('composes a base letter with a combining mark from the next chunk', async () => {
    expect(await normalizeChunks(['caf', 'e', '́!'])).toBe('café!'.normalize('NFC'))
  })

  it('composes a precomposed syllable with a trailing jamo from the next chunk', async () => {
    // 가 (U+AC00) + ᆨ (U+11A8) => 각
    expect(await normalizeChunks(['가', 'ᆨ'])).toBe('각')
  })

  it('handles every possible split point of an NFD paragraph', async () => {
    const source = '맥에서 저장한 파일명: 김의연_보고서.txt\ncafé résumé\n'
    const nfd = source.normalize('NFD')
    const bytes = Buffer.from(nfd, 'utf8')
    for (let i = 1; i < bytes.length; i++) {
      const result = await normalizeChunks([bytes.subarray(0, i), bytes.subarray(i)])
      expect(result).toBe(source.normalize('NFC'))
    }
  })

  it('flushes newline-terminated chunks without holding them back', async () => {
    const stream = new NormalizeStream()
    const out: string[] = []
    stream.on('data', (c: Buffer) => out.push(c.toString()))
    stream.write('line one\n')
    await new Promise(resolve => setImmediate(resolve))
    expect(out.join('')).toBe('line one\n')
    stream.end()
  })

  it('throws on an invalid form', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => new NormalizeStream({ form: 'FOO' as any })).toThrow(RangeError)
  })
})
