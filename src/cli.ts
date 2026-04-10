import { Command } from 'commander'
import { createReadStream, createWriteStream } from 'node:fs'
import { execSync } from 'node:child_process'
import process from 'node:process'
import pc from 'picocolors'
import { normalizeString, NormalizationForm } from './normalize'
import { NormalizeStream } from './stream'

// package.json 버전을 가져오기 위한 편법 (빌드 후 실행되므로 상대 경로 주의)
const VERSION = '0.1.0'

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
    console.log(pc.gray(`* Input(${input.length}):`), input)
    console.log(pc.gray(`* Result (${form}):`), result)
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
