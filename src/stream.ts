import { Transform, TransformCallback } from 'node:stream'
import { StringDecoder } from 'node:string_decoder'
import { normalizeString, NormalizationForm } from './normalize'
import { findSafeSplitIndex } from './unicode'

export interface NormalizeStreamOptions {
  form?: NormalizationForm
}

/**
 * A Transform stream that normalizes streamed data to the specified Unicode form.
 * Prevents Hangul jamo (and other combining characters) from being split from the
 * character they attach to at chunk boundaries.
 */
export class NormalizeStream extends Transform {
  private form: NormalizationForm
  private decoder: StringDecoder
  private buffer: string

  constructor(options: NormalizeStreamOptions = {}) {
    super()
    this.form = options.form || 'NFC'
    // Fail fast on an invalid form instead of erroring on the first chunk.
    normalizeString('', this.form)
    this.decoder = new StringDecoder('utf8')
    this.buffer = ''
  }

  _transform(chunk: Buffer | string, _encoding: string, callback: TransformCallback): void {
    try {
      // Use StringDecoder to prevent corruption at UTF-8 byte boundaries
      const decoded = typeof chunk === 'string' ? chunk : this.decoder.write(chunk)
      const text = this.buffer + decoded

      // Hold back the tail starting at the last starter character: the next chunk may
      // begin with combining marks or jamo that must be composed with it.
      const splitIndex = findSafeSplitIndex(text)
      this.buffer = text.slice(splitIndex)

      if (splitIndex > 0) {
        this.push(normalizeString(text.slice(0, splitIndex), this.form))
      }

      callback()
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)))
    }
  }

  _flush(callback: TransformCallback): void {
    try {
      const text = this.buffer + this.decoder.end()
      this.buffer = ''

      if (text.length > 0) {
        this.push(normalizeString(text, this.form))
      }

      callback()
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)))
    }
  }
}
