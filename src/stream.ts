import { Transform, TransformCallback } from 'node:stream'
import { StringDecoder } from 'node:string_decoder'
import { normalizeString, NormalizationForm } from './normalize'

export interface NormalizeStreamOptions {
  form?: NormalizationForm
}

/**
 * A Transform stream that normalizes streamed data to the specified Unicode form.
 * Prevents Hangul jamo (and other combining characters) from being split at chunk boundaries.
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
      // Use StringDecoder to prevent corruption at UTF-8 byte boundaries
      let text = typeof chunk === 'string' ? chunk : this.decoder.write(chunk)

      if (this.buffer) {
        text = this.buffer + text
        this.buffer = ''
      }

      // Check if the last character(s) are combining characters or Hangul Jamo.
      // If so, hold them in the buffer to be combined with the next chunk.
      let splitIndex = text.length
      while (splitIndex > 0) {
        const lastChar = text.charCodeAt(splitIndex - 1)
        // Hangul Jamo range (U+1100~U+11FF) or Combining Diacritical Marks (U+0300~U+036F)
        if ((lastChar >= 0x1100 && lastChar <= 0x11ff) || (lastChar >= 0x0300 && lastChar <= 0x036f)) {
          splitIndex--
        } else {
          break
        }
      }

      // If the entire text consists of jamo/combining chars, buffer everything
      if (splitIndex === 0) {
        this.buffer = text
        callback()
        return
      }

      // Normalize only the safe portion and push it downstream
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
