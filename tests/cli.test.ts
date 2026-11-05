import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { spawnSync, execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'

// These tests run the built CLI (bin/unorm.js -> dist/cli.js) exactly as users do.
const ROOT = resolve(__dirname, '..')
const BIN = join(ROOT, 'bin', 'unorm.js')

let workDir: string
let gitConfig: string

function run (args: string[], input?: string, env: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    input,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: gitConfig, NO_COLOR: '1', FORCE_COLOR: '0', ...env }
  })
  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}

// Write the config file directly: on macOS git precomposes command-line arguments to NFC
// (core.precomposeUnicode), so `git config user.name <NFD>` would never store an NFD value.
function setGitName (name: string) {
  const escaped = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  writeFileSync(gitConfig, `[user]\n\tname = "${escaped}"\n`, 'utf8')
}

function getGitName (): string {
  return execFileSync('git', ['config', '--file', gitConfig, 'user.name'], { encoding: 'utf8' }).replace(/\n$/, '')
}

beforeAll(() => {
  if (!existsSync(join(ROOT, 'dist', 'cli.js'))) {
    execFileSync('npm', ['run', 'build', '--silent'], { cwd: ROOT, stdio: 'ignore' })
  }
})

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'unorm-cli-'))
  gitConfig = join(workDir, 'gitconfig')
  writeFileSync(gitConfig, '')
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

const NAME_NFD = '홍길동'.normalize('NFD')
const NAME_NFC = '홍길동'.normalize('NFC')

describe('CLI', () => {
  it('normalizes positional text to NFC', () => {
    const { code, stdout } = run([NAME_NFD])
    expect(code).toBe(0)
    expect(stdout).toBe(NAME_NFC + '\n')
  })

  it('rejects an invalid form with a helpful message', () => {
    const { code, stderr } = run(['-f', 'foo', 'x'])
    expect(code).toBe(1)
    expect(stderr).toContain('Invalid normalization form: foo')
    expect(stderr).not.toContain('RangeError')
  })

  it('writes positional text to the -o file', () => {
    const out = join(workDir, 'out.txt')
    const { code } = run(['-o', out, NAME_NFD])
    expect(code).toBe(0)
    expect(readFileSync(out, 'utf8')).toBe(NAME_NFC + '\n')
  })

  it('normalizes stdin to stdout', () => {
    const { code, stdout } = run(['-f', 'nfc'], `${NAME_NFD}\ncafé\n`)
    expect(code).toBe(0)
    expect(stdout).toBe(`${NAME_NFC}\ncafé\n`.normalize('NFC'))
  })

  it('-t reports graphemes and code points separately', () => {
    const { code, stdout } = run(['-t', NAME_NFD])
    expect(code).toBe(0)
    expect(stdout).toContain('Form    : NFD')
    expect(stdout).toContain('Glyphs  : 3 graphemes')
    expect(stdout).toContain('Length  : 9 code points')
  })

  it('--test-git-user diagnoses an NFD name', () => {
    setGitName(NAME_NFD)
    const { code, stdout } = run(['--test-git-user'])
    expect(code).toBe(0)
    expect(stdout).toContain('Glyphs  : 3 graphemes')
    expect(stdout).toContain('unorm --fix-git-user')
  })

  it('--test-git-user explains when user.name is not set', () => {
    const { code, stderr } = run(['--test-git-user'])
    expect(code).toBe(1)
    expect(stderr).toContain('Git global user.name is not set.')
  })

  it('--fix-git-user normalizes and shows a distinguishable before/after', () => {
    setGitName(NAME_NFD)
    const { code, stdout } = run(['--fix-git-user'])
    expect(code).toBe(0)
    expect(getGitName()).toBe(NAME_NFC)
    expect(stdout).toMatch(/Before : .*NFD.*9 code points/)
    expect(stdout).toMatch(/After {2}: .*NFC.*3 code points/)
  })

  it('--fix-git-user keeps shell metacharacters intact', () => {
    const tricky = `${NAME_NFD} "q" $(echo pwned) \`id\``
    setGitName(tricky)
    const { code } = run(['--fix-git-user'])
    expect(code).toBe(0)
    expect(getGitName()).toBe(tricky.normalize('NFC'))
  })

  it('normalizes piped stdin when no arguments are given', () => {
    const { code, stdout } = run([], `${NAME_NFD}\n`)
    expect(code).toBe(0)
    expect(stdout).toBe(`${NAME_NFC}\n`)
  })

  it('--test-git-user explains when git is not installed', () => {
    const emptyDir = join(workDir, 'empty-bin')
    mkdirSync(emptyDir)
    const { code, stderr } = run(['--test-git-user'], undefined, { PATH: emptyDir, Path: emptyDir })
    expect(code).toBe(1)
    expect(stderr).toContain('git is not installed or not in PATH')
  })

  // Simulates macOS without Xcode Command Line Tools, where /usr/bin/git is a stub that fails via xcrun
  it.skipIf(process.platform === 'win32')('--fix-git-user explains a missing Xcode Command Line Tools git stub', () => {
    const binDir = join(workDir, 'stub-bin')
    mkdirSync(binDir)
    const stub = join(binDir, 'git')
    writeFileSync(stub, '#!/bin/sh\necho "xcrun: error: invalid active developer path (/Library/Developer/CommandLineTools), missing xcrun" >&2\nexit 1\n')
    chmodSync(stub, 0o755)
    const { code, stderr } = run(['--fix-git-user'], undefined, { PATH: `${binDir}${delimiter}${process.env.PATH}` })
    expect(code).toBe(1)
    expect(stderr).toContain('Xcode Command Line Tools are missing')
    expect(stderr).toContain('brew install git')
    expect(stderr).not.toContain('user.name is not set')
  })
})
