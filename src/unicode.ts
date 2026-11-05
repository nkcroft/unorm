import type { NormalizationForm } from './normalize'

export const NORMALIZATION_FORMS: readonly NormalizationForm[] = ['NFC', 'NFD', 'NFKC', 'NFKD']

/**
 * Parses a user-supplied normalization form (case-insensitive).
 * Returns undefined when the value is not a supported form.
 */
export function parseForm(value: unknown): NormalizationForm | undefined {
  if (typeof value !== 'string') return undefined
  const upper = value.trim().toUpperCase()
  return (NORMALIZATION_FORMS as readonly string[]).includes(upper)
    ? upper as NormalizationForm
    : undefined
}

const COMBINING_MARK = /\p{M}/u

/**
 * Hangul conjoining jamo that attach to a preceding character:
 * medial vowels / trailing consonants (U+1160–U+11FF) and Jamo Extended-B (U+D7B0–U+D7FF).
 */
function isHangulVowelOrTrailingJamo(cp: number): boolean {
  return (cp >= 0x1160 && cp <= 0x11ff) || (cp >= 0xd7b0 && cp <= 0xd7ff)
}

/**
 * Hangul conjoining jamo of any kind: U+1100–U+11FF, Extended-A (U+A960–U+A97F), Extended-B (U+D7B0–U+D7FF).
 */
function isHangulJamo(cp: number): boolean {
  return (cp >= 0x1100 && cp <= 0x11ff) ||
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xd7b0 && cp <= 0xd7ff)
}

/**
 * True when the code point is a decomposed building block (conjoining Hangul jamo or a combining mark).
 * Used to highlight characters that are typically produced by NFD.
 */
export function isDecomposedChar(cp: number): boolean {
  return isHangulJamo(cp) || COMBINING_MARK.test(String.fromCodePoint(cp))
}

/**
 * True when the code point may attach to (compose with or reorder against) the preceding character.
 * A conservative superset: every combining mark plus Hangul medial/trailing jamo.
 */
function isNonStarter(cp: number): boolean {
  return isHangulVowelOrTrailingJamo(cp) || COMBINING_MARK.test(String.fromCodePoint(cp))
}

/**
 * Returns the index up to which `text` can be normalized on its own, without changing the result
 * once more text is appended. Everything from the returned index onward must be held back
 * until the next chunk (or the end of the stream).
 *
 * The tail that is held back starts at the last "starter" character, because a following chunk
 * may begin with combining marks or Hangul jamo that compose with it (e.g. `e` + U+0301, `가` + U+11A8).
 */
export function findSafeSplitIndex(text: string): number {
  let i = text.length

  // A trailing control character (e.g. newline) never composes with what follows.
  const last = text.codePointAt(i - 1)
  if (last !== undefined && last < 0x20) return i

  while (i > 0) {
    // Step back one code point, honoring surrogate pairs.
    let start = i - 1
    const low = text.charCodeAt(start)
    if (low >= 0xdc00 && low <= 0xdfff && start > 0) {
      const high = text.charCodeAt(start - 1)
      if (high >= 0xd800 && high <= 0xdbff) start--
    }

    const cp = text.codePointAt(start)!
    if (!isNonStarter(cp)) return start
    i = start
  }

  return 0
}

/**
 * Counts user-perceived characters (extended grapheme clusters).
 * NFD Hangul such as `ᄀ ᅵ ᆷ` counts as one glyph, just like its NFC form.
 */
export function countGraphemes(str: string): number {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(str)).length
  }
  return [...str].length
}

/** Counts Unicode code points (not UTF-16 code units). */
export function countCodePoints(str: string): number {
  return [...str].length
}

export type DetectedForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD' | 'NFC=NFD' | 'MIXED'

/**
 * Detects the normalization form of a string.
 *
 * - `NFC=NFD`: the string is unaffected by normalization (e.g. ASCII), so it is both.
 * - `NFC` / `NFD`: the string is in exactly that canonical form.
 * - `NFKC` / `NFKD`: only the compatibility form matches.
 * - `MIXED`: none of the forms match (partly composed, partly decomposed).
 */
export function detectForm(str: string): DetectedForm {
  const isNfc = str === str.normalize('NFC')
  const isNfd = str === str.normalize('NFD')
  if (isNfc && isNfd) return 'NFC=NFD'
  if (isNfc) return 'NFC'
  if (isNfd) return 'NFD'
  if (str === str.normalize('NFKC')) return 'NFKC'
  if (str === str.normalize('NFKD')) return 'NFKD'
  return 'MIXED'
}

/** Formats each code point as `U+XXXX`, wrapping decomposed characters in brackets. */
export function toCodepoints(str: string): string {
  return [...str].map(ch => {
    const cp = ch.codePointAt(0)!
    const hex = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')
    return isDecomposedChar(cp) ? `[${hex}]` : hex
  }).join(' ')
}

/** Renders decomposed characters as `\uXXXX` escapes and passes everything else through. */
export function toEscaped(str: string): string {
  return [...str].map(ch => {
    const cp = ch.codePointAt(0)!
    if (isDecomposedChar(cp)) {
      return cp > 0xffff
        ? `\\u{${cp.toString(16).toUpperCase()}}`
        : `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`
    }
    return ch
  }).join('')
}
