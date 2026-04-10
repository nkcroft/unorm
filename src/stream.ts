import { Transform, TransformCallback } from 'node:stream'
import { StringDecoder } from 'node:string_decoder'
import { normalizeString, NormalizationForm } from './normalize'

export interface NormalizeStreamOptions {
  form?: NormalizationForm
}

/**
 * 스트림 데이터를 지정된 유니코드 정규화 폼으로 변환하는 Transform 스트림입니다.
 * 청크(Chunk) 경계에서 유니코드 문자(특히 한글 자소)가 분리되는 현상을 방지합니다.
 */
export class NormalizeStream extends Transform {
  private form: NormalizationForm
  private decoder: StringDecoder
  private buffer: string

  constructor(options: NormalizeStreamOptions = {}) {
    super()
    this.form = options.form || 'NFC'
    this.decoder = new StringDecoder('utf8')
    this.buffer = ''
  }

  _transform(chunk: Buffer | string, encoding: string, callback: TransformCallback): void {
    try {
      // StringDecoder를 사용하여 UTF-8 바이트 경계에서 깨지는 것을 방지
      let text = typeof chunk === 'string' ? chunk : this.decoder.write(chunk)
      
      if (this.buffer) {
        text = this.buffer + text
        this.buffer = ''
      }

      // 청크의 마지막 문자가 결합 문자(Combining Character)나 한글 자모(Jamo)인지 확인
      // 만약 그렇다면 다음 청크와 결합해야 하므로 버퍼에 보관
      let splitIndex = text.length
      while (splitIndex > 0) {
        const lastChar = text.charCodeAt(splitIndex - 1)
        // 한글 자모 영역 (U+1100 ~ U+11FF) 또는 결합 마크 영역 (U+0300 ~ U+036F)
        if ((lastChar >= 0x1100 && lastChar <= 0x11ff) || (lastChar >= 0x0300 && lastChar <= 0x036f)) {
          splitIndex--
        } else {
          break
        }
      }

      // 텍스트 전체가 자모/결합 문자인 경우 전부 버퍼링
      if (splitIndex === 0) {
        this.buffer = text
        callback()
        return
      }

      // 안전한 부분까지만 정규화하여 스트림으로 내보냄
      if (splitIndex < text.length) {
        this.buffer = text.slice(splitIndex)
        text = text.slice(0, splitIndex)
      }

      if (text.length > 0) {
        this.push(normalizeString(text, this.form))
      }
      
      callback()
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)))
    }
  }

  _flush(callback: TransformCallback): void {
    try {
      let text = this.buffer
      const endText = this.decoder.end()
      
      if (endText) {
        text += endText
      }

      if (text.length > 0) {
        this.push(normalizeString(text, this.form))
      }
      
      callback()
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)))
    }
  }
}
