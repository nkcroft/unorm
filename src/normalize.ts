export type NormalizationForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD'

/**
 * Normalizes a string to the specified Unicode normalization form.
 * @param str The input string to normalize
 * @param form The normalization form (default: NFC)
 * @returns The normalized string
 */
export function normalizeString(str: string, form: NormalizationForm = 'NFC'): string {
  return str.normalize(form)
}
