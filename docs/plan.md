# `@nkcroft/unorm` Project Plan

## 1. Project Overview

* Package name: `@nkcroft/unorm`
* Goal: Develop a fast and lightweight `Node.js`-based Unicode Normalization CLI tool and library, inspired by ICU's `uconv` utility.
* Target users: Developers and system administrators who need a simple terminal solution for issues such as Hangul jamo decomposition (`NFD`) that occurs when exchanging filenames and text data between macOS and Windows/Linux.

## 2. Tech Stack

* Language: `TypeScript` (stable type support and modern JavaScript ecosystem)
* Runtime: `Node.js` (v18 or higher recommended)
* Main Dependencies:
    * `commander`: CLI interface
    * (optional) `chalk` or `picocolors`: terminal output formatting
* Dev & Build Tools:
    * `vite`: library and CLI build bundler
    * `typescript`: static type checking and transpilation
    * `eslint` (v9): code linting (Flat Config with `defineConfig`)
    * `vitest`: unit testing (fast execution with native TypeScript support)
* Core Logic: Node.js built-in `String.prototype.normalize()` and `stream` API (for large file processing)

## 3. Core Features

### A. CLI (Command Line Interface)

* Standard I/O (`stdin`/`stdout`) stream support via pipe (`|`).
* Accept file paths directly and save the normalized result to a new file.
* Supported options (Flags):
    * `-v`, `--version`: output package version
    * `-h`, `--help`: display help and usage examples
    * `-f`, `--form <type>`: normalization form (default: `NFC`; supports `NFC`, `NFD`, `NFKC`, `NFKD`; lowercase also accepted)
    * `-i`, `--input <file>`: input file path (uses `stdin` if not provided)
    * `-o`, `--output <file>`: output file path (uses `stdout` if not provided)
    * `-t`, `--test <file|string>`: test string normalization (shows codepoints and escaped form)
    * `--test-git-user`: test current git global `user.name` normalization form (read-only)
    * `--fix-git-user`: convenience feature to automatically normalize NFD-decomposed Git global `user.name` to `NFC`

### B. Library API

* Provide a functional API that can be used via `import` or `require` in other `Node.js` projects.
* Separate design for string normalization (`normalizeString`) and stream normalization (`normalizeStream`).

## 4. Directory Structure

```plain
@nkcroft/unorm/
├── src/
│   ├── cli.ts          # Commander.js CLI setup and entry point
│   ├── index.ts        # Library API exports
│   ├── normalize.ts    # Core normalization logic (string processing)
│   └── stream.ts       # Transform Stream logic for large file processing
├── bin/
│   └── unorm.js        # CLI executable (includes shebang)
├── tests/              # Vitest-based test code
├── package.json
├── tsconfig.json
├── vite.config.ts      # Vite build and bundling configuration
├── eslint.config.ts    # ESLint 9 Flat Config (using defineConfig)
└── README.md
```

## 5. Development Milestones

* Phase 1: Initial setup and core logic
    * Configure `vite` and `typescript` environments (`vite.config.ts`, `tsconfig.json` build scripts).
    * Configure `eslint` (v9) with `defineConfig`-based Flat Config in `eslint.config.ts` and apply `StandardJS` rules.
    * Implement core normalization function in `src/normalize.ts` using `String.prototype.normalize`.
    * Set up `vitest` unit tests and write test cases for Hangul `NFD`/`NFC` conversion.

* Phase 2: Stream processing
    * Extend `Node.js` `Transform` stream in `src/stream.ts` to normalize Unicode chunk by chunk without corruption. (Note: requires logic to prevent characters from being split at chunk boundaries)
    * Performance (benchmark) and safety tests for large file stream conversion.

* Phase 3: CLI interface
    * Integrate `commander` package and implement `src/cli.ts`.
    * Connect `bin/unorm.js` so that the `unorm` command works after global installation.
    * Implement convenience features such as `--fix-git-user` with error handling (e.g., when `git` is not installed).

* Phase 4: Documentation and release preparation
    * Document CLI and API usage in `README.md`.
    * Configure a `GitHub Actions`-based CI/CD pipeline (automated `npm` publish) triggered by merging into the `release` branch.

## 6. Usage Examples

### CLI:

```bash
# Convert via pipeline
cat mac_nfd_text.txt | unorm -f NFC > win_nfc_text.txt
cat mac_nfd_text.txt | unorm > win_nfc_text.txt # default NFC

# Convert by specifying files directly
unorm -i mac_nfd_text.txt -o win_nfc_text.txt -f NFC
unorm -i mac_nfd_text.txt -o win_nfc_text.txt # default NFC

# Test git user.name
unorm -t "$(git config --global user.name)"
# * Input(9): ㅎㅗㅇㄱㅣㄹㄷㅗㅇ
# * Result: NFD

# Fix git user.name to NFC (convenience feature)
unorm --fix-git-user
# Internally equivalent to: git config --global user.name "$(git config --global user.name | unorm)"
```

### Node.js code:

```ts
import { normalizeString } from '@nkcroft/unorm'

const nfdString = 'ㅎㅏㄴㄱㅡㄹ'
const nfcString = normalizeString(nfdString, 'NFC')
// '한글'
console.log(nfcString)
```

## 7. Release & Versioning

* `@nkcroft/unorm` — published to npm under the `@nkcroft` organization
* **Branch Strategy**:
    * `main`: default development branch (for PR merges)
    * `release`: deployment branch (triggers the release pipeline when `main` is merged into `release`)
* Automated release and versioning via the GitHub `release-please` pipeline

## 8. Development & Contribution Rules

* **Public Repository**: This project is open source and welcomes contributions from anyone.
* **Branch Strategy**:
    * All work is performed in a new feature branch (e.g., `feat/`, `fix/`, `docs/`).
    * After completion, open a PR to merge into the `main` branch.
    * Actual deployment happens when changes from `main` are merged into the `release` branch.
* **Coding Convention**: Strictly follows the **StandardJS** philosophy (no semicolons (`;`), single quotes (`'`), minimal configuration).
* **Commit Convention**: All commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification (e.g., `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
