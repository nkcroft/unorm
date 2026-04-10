# `@nkcroft/unorm`

Fast and lightweight Node.js based Unicode Normalization CLI tool and library.

Designed to solve Korean Hangul jamo decomposition (NFD) issues that occur when exchanging filenames and text data between macOS and Windows/Linux environments.

## Features

- **CLI Tool**: Standard I/O stream conversion via pipe (`|`) and file-based conversion
- **Library API**: Functional API for direct use in Node.js projects via `import`
- **Safe Stream Processing**: Safely handles chunk boundaries to prevent Hangul jamo from being split during large file conversion
- **Git User Fix**: One-command fix for NFD-decomposed Git global `user.name` — restores it to proper NFC form

## Installation

### Global (CLI)

```bash
npm install -g @nkcroft/unorm
```

### Local (Library)

```bash
npm install @nkcroft/unorm
```

## CLI Usage

### Basic Usage

Convert via pipeline (default form: `NFC`):

```bash
cat mac_nfd_text.txt | unorm > win_nfc_text.txt
```

Specify input and output files directly:

```bash
unorm -i mac_nfd_text.txt -o win_nfc_text.txt -f NFC
```

### Options

```bash
Usage: unorm [options]

Fast and lightweight Unicode Normalization CLI tool

Options:
  -v, --version        output the version number
  -f, --form <type>    normalization form (NFC, NFD, NFKC, NFKD) (default: "NFC")
  -i, --input <file>   input file path (uses stdin if not provided)
  -o, --output <file>  output file path (uses stdout if not provided)
  -t, --test <string>  test string normalization (shows codepoints and escaped form)
  --test-git-user      test current git global user.name normalization form (read-only)
  --fix-git-user       fix NFD separated git global user.name to NFC
  -h, --help           display help for command
```

### Fix Hangul Jamo Decomposition in Git user.name

On macOS, the Git global `user.name` can become NFD-decomposed, causing commit logs to display characters like `ㅎㅗㅇㄱㅣㄹㄷㅗㅇ` instead of the correct form.

#### ⚡ Run instantly without installation (recommended)

```bash
# Step 1: Diagnose current state (read-only, no changes made)
npx @nkcroft/unorm@latest --test-git-user

# Step 2: Normalize to NFC if NFD is detected
npx @nkcroft/unorm@latest --fix-git-user
```

> [!IMPORTANT]
> **If you use a custom `unorm` command globally**: If you have your own `unorm` script or binary already in your `PATH`, `npx @nkcroft/unorm@latest` may execute that instead of this npm package, producing unexpected output.
>
> Verify which binary is being resolved:
> ```bash
> which unorm                            # check if a local binary takes precedence
> npx @nkcroft/unorm@latest --version   # should print the package version number
> ```
> If the version does not match, rename the conflicting file to avoid the conflict:
> ```bash
> mv ~/.bin/unorm ~/.bin/unorm-legacy   # example — adjust path to your actual location
> ```

#### After global installation

```bash
npm install -g @nkcroft/unorm

# Step 1: Diagnose current state (read-only, no changes made)
unorm --test-git-user

# Step 2: Normalize to NFC if NFD is detected
unorm --fix-git-user
```

## Library Usage

### String normalization (`normalizeString`)

```typescript
import { normalizeString } from '@nkcroft/unorm'

// Convert NFD (decomposed) string to NFC
const nfdString = '한글'
const nfcString = normalizeString(nfdString, 'NFC')

console.log(nfcString) // '한글'
```

### Stream normalization (`NormalizeStream`)

Useful for processing large text files or network streams. Chunk boundary splitting of Hangul jamo is handled safely internally.

```typescript
import { createReadStream, createWriteStream } from 'node:fs'
import { NormalizeStream } from '@nkcroft/unorm'

const inputStream = createReadStream('input-nfd.txt')
const outputStream = createWriteStream('output-nfc.txt')
const normalizeStream = new NormalizeStream({ form: 'NFC' })

inputStream.pipe(normalizeStream).pipe(outputStream)
```

## Development & Contribution

- **GitHub Repository**: This project is open source and welcomes contributions.
- **Branch Strategy**: All work is done in feature branches (`feat/`, `fix/`, `docs/`, etc.) and merged into `main` via PR. Releases are triggered by merging `main` into the `release` branch via an automated pipeline.
- **Coding Convention**: Strictly follows the **StandardJS** philosophy (no semicolons, single quotes).
- **Commit Convention**: All commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Troubleshooting

### `npx @nkcroft/unorm` runs a wrong command

If `npx @nkcroft/unorm` produces unexpected output (e.g. `* Input(N): ...` instead of the formatted diagnostic), a `unorm` binary already in your `PATH` is shadowing the npm package. This can happen if you have previously created your own `unorm` script or installed another tool with the same name.

**Diagnose:**
```bash
which unorm                           # reveals the file taking precedence
npx @nkcroft/unorm@latest --version  # should print the package version
```

**Fix:** Rename or move the conflicting binary so this package takes precedence:
```bash
mv /path/to/your/unorm /path/to/your/unorm-legacy
```

After resolving the conflict, `npx @nkcroft/unorm` will run the npm package correctly.

---

### `npx @nkcroft/unorm --version` says `unorm: command not found`

On recent npm versions, `npx @nkcroft/unorm <args>` can be interpreted as "run the `unorm` command" instead of "install and run the `@nkcroft/unorm` package", which results in:

```text
sh: unorm: command not found
```

**Fix:** Specify a version (recommended):

```bash
npx @nkcroft/unorm@latest --version
```

If you need an alternative form, you can also run via `npm exec` explicitly:

```bash
npm exec --yes --package @nkcroft/unorm@latest -- unorm --version
```

### `--version` reports an old version after `npm cache clean`

`npm cache clean` clears the registry cache but `npx` maintains its own package cache under `~/.npm/_npx/`. If the version still appears stale, specify the version explicitly:

```bash
npx @nkcroft/unorm@latest --version
```

## License

[MIT](LICENSE)
