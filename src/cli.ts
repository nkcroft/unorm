import { Command } from 'commander'
import { createReadStream, createWriteStream } from 'node:fs'
import { execSync } from 'node:child_process'
import process from 'node:process'
import pc from 'picocolors'
import { normalizeString, NormalizationForm } from './normalize'
import { NormalizeStream } from './stream'

const VERSION = '0.1.0'

// 한글 자모 범위: U+1100~U+11FF (Hangul Jamo), U+A960~U+A97F (Extended-A), U+D7B0~U+D7FF (Extended-B)
// 결합 문자 범위: U+0300~U+036F, U+1DC0~U+1DFF (Combining Diacritical Marks)
function isDecomposedChar(cp: number): boolean {
  return (cp >= 0x1100 && cp <= 0x11ff) ||
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xd7b0 && cp <= 0xd7ff) ||
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1dc0 && cp <= 0x1dff)
}

// 각 코드포인트를 U+XXXX 표기법으로 변환
// 자소 분리된 문자는 강조 표시
function toCodepoints(str: string): string {
  return [...str].map(ch => {
    const cp = ch.codePointAt(0)!
    const hex = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')
    return isDecomposedChar(cp) ? `[${hex}]` : hex
  }).join(' ')
}

// 자소 분리된 문자는 \uXXXX 이스케이프로, 일반 문자는 그대로 출력
function toEscaped(str: string): string {
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

// 문자열의 정규화 형태를 감지
function detectForm(str: string): string {
  if (str === str.normalize('NFC') && str !== str.normalize('NFD')) return 'NFC'
  if (str === str.normalize('NFD') && str !== str.normalize('NFC')) return 'NFD'
  if (str === str.normalize('NFKC')) return 'NFKC'
  if (str === str.normalize('NFKD')) return 'NFKD'
  return 'NFC/NFD'
}

function formatForm(form: string): string {
  if (form === 'NFD' || form === 'NFKD') return pc.red(form) + pc.red(' ⚠ (decomposed)')
  return pc.green(form) + pc.green(' ✓')
}

export function runCli(args: string[] = process.argv) {
  const program = new Command()

  program
    .name('unorm')
    .description('Fast and lightweight Unicode Normalization CLI tool')
    .version(VERSION, '-v, --version')
    .option('-f, --form <type>', 'normalization form (NFC, NFD, NFKC, NFKD)', 'NFC')
    .option('-i, --input <file>', 'input file path (uses stdin if not provided)')
    .option('-o, --output <file>', 'output file path (uses stdout if not provided)')
    .option('-t, --test <string>', 'test string normalization')
    .option('--fix-git-user', 'fix NFD separated git global user.name to NFC')

  program.parse(args)

  const options = program.opts()
  const form = options.form.toUpperCase() as NormalizationForm

  // 1. --fix-git-user 옵션 처리
  if (options.fixGitUser) {
    try {
      const currentName = execSync('git config --global user.name', { encoding: 'utf8' }).trim()
      if (!currentName) {
        console.error(pc.yellow('Git global user.name is not set.'))
        process.exit(1)
      }

      const normalizedName = normalizeString(currentName, 'NFC')
      
      if (currentName === normalizedName) {
        console.log(pc.green('Git user.name is already normalized (NFC).'))
        console.log(`Current: ${pc.cyan(currentName)}`)
        process.exit(0)
      }

      execSync(`git config --global user.name "${normalizedName}"`)
      console.log(pc.green('Successfully normalized git user.name to NFC!'))
      console.log(`Before: ${pc.red(currentName)}`)
      console.log(`After : ${pc.cyan(normalizedName)}`)
      process.exit(0)
    } catch (error) {
      console.error(pc.red('Failed to fix git user.name. Is git installed?'))
      console.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }

  // 2. -t, --test 옵션 처리
  if (options.test) {
    const input = options.test
    const result = normalizeString(input, form)
    const inputForm = detectForm(input)

    console.log()
    console.log(pc.bold('[ Input ]'))
    console.log(`  Visual  : ${input}`)
    console.log(`  Form    : ${formatForm(inputForm)}`)
    console.log(`  Length  : ${pc.yellow(String(input.length))} chars`)
    console.log(`  Glyphs  : ${pc.cyan(String([...input].length))} graphemes`)
    console.log(`  Escaped : ${pc.gray(toEscaped(input))}`)
    console.log(`  CodePts : ${pc.gray(toCodepoints(input))}`)

    console.log()
    console.log(pc.bold(`[ Result → ${form} ]`))
    console.log(`  Visual  : ${pc.green(result)}`)
    console.log(`  Form    : ${formatForm(detectForm(result))}`)
    console.log(`  Length  : ${pc.yellow(String(result.length))} chars`)
    console.log(`  Glyphs  : ${pc.cyan(String([...result].length))} graphemes`)
    console.log(`  Escaped : ${pc.gray(toEscaped(result))}`)
    console.log(`  CodePts : ${pc.gray(toCodepoints(result))}`)
    console.log()

    process.exit(0)
  }

  // 3. 스트림 변환 처리 (파일 입출력 또는 stdin/stdout)
  const inputStream = options.input ? createReadStream(options.input) : process.stdin
  const outputStream = options.output ? createWriteStream(options.output) : process.stdout
  const normalizeStream = new NormalizeStream({ form })

  inputStream.on('error', (err) => {
    console.error(pc.red(`Input stream error: ${err.message}`))
    process.exit(1)
  })

  outputStream.on('error', (err) => {
    console.error(pc.red(`Output stream error: ${err.message}`))
    process.exit(1)
  })

  // 파이프 연결
  inputStream.pipe(normalizeStream).pipe(outputStream)
}
