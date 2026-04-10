import { Command } from 'commander'
import { createReadStream, createWriteStream } from 'node:fs'
import { execSync } from 'node:child_process'
import process from 'node:process'
import pc from 'picocolors'
import { normalizeString, NormalizationForm } from './normalize'
import { NormalizeStream } from './stream'

declare const __PKG_VERSION__: string
const VERSION = __PKG_VERSION__

// Hangul Jamo ranges: U+1100~U+11FF (Jamo), U+A960~U+A97F (Extended-A), U+D7B0~U+D7FF (Extended-B)
// Combining character ranges: U+0300~U+036F, U+1DC0~U+1DFF (Combining Diacritical Marks)
function isDecomposedChar(cp: number): boolean {
  return (cp >= 0x1100 && cp <= 0x11ff) ||
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xd7b0 && cp <= 0xd7ff) ||
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1dc0 && cp <= 0x1dff)
}

// Convert each codepoint to U+XXXX notation.
// Decomposed (NFD) characters are highlighted with brackets.
function toCodepoints(str: string): string {
  return [...str].map(ch => {
    const cp = ch.codePointAt(0)!
    const hex = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')
    return isDecomposedChar(cp) ? `[${hex}]` : hex
  }).join(' ')
}

// Render decomposed characters as \uXXXX escape sequences; pass normal characters through as-is.
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

// Detect the normalization form of the given string.
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
    const tmp = new Command()
      .name('unorm')
      .description('Fast and lightweight Unicode Normalization CLI tool')
      .version(VERSION, '-v, --version')
      .option('-f, --form <type>', 'normalization form (NFC, NFD, NFKC, NFKD)', 'NFC')
      .option('-i, --input <file>', 'input file path (uses stdin if not provided)')
      .option('-o, --output <file>', 'output file path (uses stdout if not provided)')
      .option('-t, --test <string>', 'test string normalization')
      .option('--test-git-user', 'test current git global user.name normalization form (read-only)')
      .option('--fix-git-user', 'fix NFD separated git global user.name to NFC')

    tmp.outputHelp()
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

  const program = new Command()

  program
    .name('unorm')
    .description('Fast and lightweight Unicode Normalization CLI tool')
    .version(VERSION, '-v, --version')
    .option('-f, --form <type>', 'normalization form (NFC, NFD, NFKC, NFKD)', 'NFC')
    .option('-i, --input <file>', 'input file path (uses stdin if not provided)')
    .option('-o, --output <file>', 'output file path (uses stdout if not provided)')
    .option('-t, --test <string>', 'test string normalization')
    .option('--test-git-user', 'test current git global user.name normalization form (read-only)')
    .option('--fix-git-user', 'fix NFD separated git global user.name to NFC')
    .argument('[text...]', 'text to normalize (when no -i/--input is provided)')
    .showHelpAfterError(true)
    .exitOverride()

  try {
    program.parse(args)
  } catch (error) {
    // commander already printed a useful error + help (showHelpAfterError)
    process.exit(typeof (error as any)?.exitCode === 'number' ? (error as any).exitCode : 1)
  }

  const options = program.opts()
  const form = options.form.toUpperCase() as NormalizationForm

  // 1. --test-git-user: read-only diagnosis of git global user.name
  if (options.testGitUser) {
    try {
      const currentName = execSync('git config --global user.name', { encoding: 'utf8' }).trim()
      if (!currentName) {
        console.error(pc.yellow('Git global user.name is not set.'))
        process.exit(1)
      }

      const detectedForm = detectForm(currentName)
      const nfcName = normalizeString(currentName, 'NFC')

      console.log()
      console.log(pc.bold('[ git config --global user.name ]'))
      console.log(`  Visual  : ${currentName}`)
      console.log(`  Form    : ${formatForm(detectedForm)}`)
      console.log(`  Length  : ${pc.yellow(String(currentName.length))} chars`)
      console.log(`  Glyphs  : ${pc.cyan(String([...currentName].length))} graphemes`)
      console.log(`  Escaped : ${pc.gray(toEscaped(currentName))}`)
      console.log(`  CodePts : ${pc.gray(toCodepoints(currentName))}`)

      if (currentName !== nfcName) {
        console.log()
        console.log(pc.yellow('  ⚠ NFD detected. Run `unorm --fix-git-user` to normalize.'))
      } else {
        console.log()
        console.log(pc.green('  ✓ Already normalized (NFC). No action needed.'))
      }
      console.log()

      process.exit(0)
    } catch (error) {
      console.error(pc.red('Failed to read git user.name. Is git installed?'))
      console.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }

  // 2. --fix-git-user: normalize git global user.name to NFC
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

  // 3. Positional string input: normalize provided text and print to stdout
  // Example: `unorm -f NFD "한글"`
  //
  // If input/output is provided, we assume stream/file mode instead.
  if (program.args.length > 0 && !options.input && !options.output) {
    const input = program.args.join(' ')
    const result = normalizeString(input, form)
    process.stdout.write(result)
    if (!result.endsWith('\n')) process.stdout.write('\n')
    process.exit(0)
  }

  // 4. -t, --test: display detailed normalization info for the given string
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
