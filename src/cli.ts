import { Command, CommanderError } from 'commander'
import { createReadStream, createWriteStream, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import pc from 'picocolors'
import { normalizeString } from './normalize'
import {
  NORMALIZATION_FORMS,
  countCodePoints,
  countGraphemes,
  detectForm,
  parseForm,
  toCodepoints,
  toEscaped,
  type DetectedForm
} from './unicode'
import { NormalizeStream } from './stream'

declare const __PKG_VERSION__: string
const VERSION = __PKG_VERSION__

const FORM_STYLE: Record<DetectedForm, (s: string) => string> = {
  NFC: s => pc.green(s + ' ✓'),
  NFKC: s => pc.green(s + ' ✓'),
  'NFC=NFD': s => pc.green(s + ' ✓ (no composable characters)'),
  NFD: s => pc.red(s + ' ⚠ (decomposed)'),
  NFKD: s => pc.red(s + ' ⚠ (decomposed)'),
  MIXED: s => pc.yellow(s + ' ⚠ (partially decomposed)')
}

function formatForm(form: DetectedForm): string {
  return FORM_STYLE[form](form)
}

// Print a detailed breakdown of a string's normalization state.
function printDetails(title: string, str: string, visual: (s: string) => string = s => s): void {
  console.log(pc.bold(title))
  console.log(`  Visual  : ${visual(str)}`)
  console.log(`  Form    : ${formatForm(detectForm(str))}`)
  console.log(`  Glyphs  : ${pc.cyan(String(countGraphemes(str)))} graphemes (user-perceived characters)`)
  console.log(`  Length  : ${pc.yellow(String(countCodePoints(str)))} code points, ${str.length} UTF-16 units`)
  console.log(`  Escaped : ${pc.gray(toEscaped(str))}`)
  console.log(`  CodePts : ${pc.gray(toCodepoints(str))}`)
}

// One-line summary used for before/after comparisons.
function summarize(str: string): string {
  return `${formatForm(detectForm(str))}, ${countCodePoints(str)} code points  ${pc.gray(toEscaped(str))}`
}

class GitUserError extends Error {}

function readGitUserName(): string {
  try {
    return execFileSync('git', ['config', '--global', 'user.name'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).replace(/\r?\n$/, '')
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { status?: number }
    if (err.code === 'ENOENT') throw new GitUserError('git is not installed or not in PATH.')
    // `git config` exits with status 1 when the key is not set
    if (err.status === 1) throw new GitUserError('Git global user.name is not set.')
    throw error
  }
}

function writeGitUserName(name: string): void {
  // Pass the value as an argument (no shell) so quotes, `$` or backticks in the name are safe
  execFileSync('git', ['config', '--global', 'user.name', name], { stdio: ['ignore', 'pipe', 'pipe'] })
}

function reportGitError(action: string, error: unknown): never {
  if (error instanceof GitUserError) {
    console.error(pc.yellow(error.message))
  } else {
    console.error(pc.red(`Failed to ${action} git user.name.`))
    console.error(error instanceof Error ? error.message : String(error))
  }
  process.exit(1)
}

function buildProgram(): Command {
  return new Command()
    .name('unorm')
    .description('Fast and lightweight Unicode Normalization CLI tool')
    .version(VERSION, '-v, --version')
    .option('-f, --form <type>', 'normalization form (NFC, NFD, NFKC, NFKD)', 'NFC')
    .option('-i, --input <file>', 'input file path (uses stdin if not provided)')
    .option('-o, --output <file>', 'output file path (uses stdout if not provided)')
    .option('-t, --test <string>', 'test string normalization')
    .option('--test-git-user', 'test current git global user.name normalization form (read-only)')
    .option('--fix-git-user', 'fix NFD separated git global user.name to NFC')
}

function looksLikeOptionToken(token: string): boolean {
  return token.startsWith('--') || (token.startsWith('-') && token.length > 1)
}

function isKnownOptionToken(token: string): boolean {
  const t = token.split('=')[0]

  // commander supports combined short flags, but we only whitelist the ones this CLI actually uses
  return t === '-v' ||
    t === '--version' ||
    t === '-f' ||
    t === '--form' ||
    t === '-i' ||
    t === '--input' ||
    t === '-o' ||
    t === '--output' ||
    t === '-t' ||
    t === '--test' ||
    t === '--test-git-user' ||
    t === '--fix-git-user' ||
    t === '-h' ||
    t === '--help'
}

export function runCli(args: string[] = process.argv) {
  const argv = args.slice(2)

  // No args: show help instead of hanging on stdin
  if (argv.length === 0) {
    buildProgram().outputHelp()
    process.exit(0)
  }

  // If argv contains no option-like tokens at all, treat it as a literal string input and normalize to NFC.
  // Example: `unorm "한글"` or `unorm some text`
  const hasAnyOptionLikeToken = argv.some(looksLikeOptionToken)
  if (!hasAnyOptionLikeToken) {
    const input = argv.join(' ')
    process.stdout.write(normalizeString(input, 'NFC'))
    if (!input.endsWith('\n')) process.stdout.write('\n')
    process.exit(0)
  }

  // If user passes something that *looks* like an option but is not a known option,
  // treat it as a literal string input and normalize to NFC.
  //
  // This prevents "unknown option" errors for inputs like "--foo" or "-bar" that are
  // intended as text, and it also helps with `npx @scope/pkg` edge cases.
  const optionLikeTokens = argv.filter(looksLikeOptionToken)
  const hasUnknownOptionLikeToken = optionLikeTokens.some(t => !isKnownOptionToken(t))
  const hasKnownOptionLikeToken = optionLikeTokens.some(isKnownOptionToken)

  if (hasUnknownOptionLikeToken && !hasKnownOptionLikeToken) {
    const input = argv.join(' ')
    process.stdout.write(normalizeString(input, 'NFC'))
    if (!input.endsWith('\n')) process.stdout.write('\n')
    process.exit(0)
  }

  const program = buildProgram()

  program
    .argument('[text...]', 'text to normalize (when no -i/--input is provided)')
    .showHelpAfterError(true)
    .exitOverride()

  try {
    program.parse(args)
  } catch (error) {
    // commander already printed a useful error + help (showHelpAfterError)
    if (error instanceof CommanderError) process.exit(error.exitCode)
    process.exit(1)
  }

  const options = program.opts()
  const form = parseForm(options.form)
  if (!form) {
    console.error(pc.red(`Invalid normalization form: ${options.form}`))
    console.error(`Supported forms: ${NORMALIZATION_FORMS.join(', ')} (case-insensitive)`)
    process.exit(1)
  }

  // 1. --test-git-user: read-only diagnosis of git global user.name
  if (options.testGitUser) {
    let currentName: string
    try {
      currentName = readGitUserName()
    } catch (error) {
      reportGitError('read', error)
    }

    console.log()
    printDetails('[ git config --global user.name ]', currentName)
    console.log()
    if (currentName !== normalizeString(currentName, 'NFC')) {
      console.log(pc.yellow('  ⚠ Not NFC. Run `unorm --fix-git-user` to normalize.'))
    } else {
      console.log(pc.green('  ✓ Already normalized (NFC). No action needed.'))
    }
    console.log()
    process.exit(0)
  }

  // 2. --fix-git-user: normalize git global user.name to NFC
  if (options.fixGitUser) {
    let currentName: string
    try {
      currentName = readGitUserName()
    } catch (error) {
      reportGitError('read', error)
    }

    const normalizedName = normalizeString(currentName, 'NFC')
    if (currentName === normalizedName) {
      console.log(pc.green('Git user.name is already normalized (NFC). No changes made.'))
      console.log(`Current: ${pc.cyan(currentName)}  ${summarize(currentName)}`)
      process.exit(0)
    }

    let savedName: string
    try {
      writeGitUserName(normalizedName)
      savedName = readGitUserName()
    } catch (error) {
      reportGitError('update', error)
    }

    if (savedName !== normalizedName) {
      console.error(pc.red('git user.name was written but reads back differently:'))
      console.error(`Saved : ${summarize(savedName)}`)
      process.exit(1)
    }

    console.log(pc.green('Successfully normalized git user.name to NFC!'))
    console.log(`  Before : ${pc.red(currentName)}  ${summarize(currentName)}`)
    console.log(`  After  : ${pc.cyan(savedName)}  ${summarize(savedName)}`)
    console.log(pc.gray(`  Glyphs are identical (${countGraphemes(savedName)}); only the encoding changed.`))
    process.exit(0)
  }

  // 3. Positional string input: normalize provided text and print to stdout
  // Example: `unorm -f NFD "한글"`
  //
  // If input/output is provided, we assume stream/file mode instead.
  // With -o, the normalized text is written to the output file instead of stdout.
  if (program.args.length > 0 && !options.input && !options.test) {
    const input = program.args.join(' ')
    let result = normalizeString(input, form)
    if (!result.endsWith('\n')) result += '\n'
    if (options.output) {
      try {
        writeFileSync(options.output, result)
      } catch (error) {
        console.error(pc.red(`Output file error: ${error instanceof Error ? error.message : String(error)}`))
        process.exit(1)
      }
    } else {
      process.stdout.write(result)
    }
    process.exit(0)
  }

  // 4. -t, --test: display detailed normalization info for the given string
  if (options.test) {
    const input = options.test
    const result = normalizeString(input, form)

    console.log()
    printDetails('[ Input ]', input)
    console.log()
    printDetails(`[ Result → ${form} ]`, result, pc.green)
    console.log()

    process.exit(0)
  }

  // 5. Stream normalization: file I/O or stdin/stdout
  if (program.args.length > 0) {
    console.error(pc.red(`Unknown argument(s): ${program.args.join(' ')}`))
    program.outputHelp()
    process.exit(1)
  }

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

  // Wire up the pipeline
  inputStream.pipe(normalizeStream).pipe(outputStream)
}
