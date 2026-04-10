export type NormalizationForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD'

/**
 * 문자열을 지정된 유니코드 정규화 폼으로 변환합니다.
 * @param str 변환할 원본 문자열
 * @param form 정규화 폼 (기본값: NFC)
 * @returns 정규화된 문자열
 */
export function normalizeString(str: string, form: NormalizationForm = 'NFC'): string {
  return str.normalize(form)
}
