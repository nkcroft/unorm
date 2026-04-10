# @nkcroft/unorm

Fast and lightweight Node.js based Unicode Normalization CLI tool and library.

macOS와 Windows/Linux 간의 파일명 및 텍스트 데이터 교환 시 발생하는 한글 자소 분리(NFD) 현상 등을 터미널에서 간단하게 해결하기 위해 만들어진 유니코드 정규화 도구입니다.

## Features

- **CLI Tool**: 파이프(`|`)를 통한 표준 입출력 스트림 변환 및 파일 변환 지원
- **Library API**: Node.js 프로젝트에서 직접 `import`하여 사용할 수 있는 함수형 API 제공
- **Safe Stream Processing**: 대용량 파일 변환 시 청크(Chunk) 경계에서 한글 자모가 깨지지 않도록 안전하게 처리
- **Git User Fix**: 자소 분리된 Git 전역 사용자 이름(`user.name`)을 정상적인 NFC로 원클릭 치환하는 기능 제공

## Installation

### 글로벌 설치 (CLI 사용)

```bash
npm install -g @nkcroft/unorm
```

### 로컬 설치 (라이브러리 사용)

```bash
npm install @nkcroft/unorm
```

## CLI Usage

### 기본 사용법

파이프라인을 이용하여 변환할 수 있습니다. (기본값: `NFC`)

```bash
cat mac_nfd_text.txt | unorm > win_nfc_text.txt
```

파일 경로를 직접 지정하여 변환할 수도 있습니다.

```bash
unorm -i mac_nfd_text.txt -o win_nfc_text.txt -f NFC
```

### 옵션 (Options)

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

### Git 사용자 이름(user.name) 자소 분리 해결

macOS 환경 등에서 Git 전역 사용자 이름이 자소 분리(`NFD`)되어 커밋 로그에 `ㅎㅗㅇㄱㅣㄹㄷㅗㅇ` 처럼 표시되는 현상을 해결합니다.

#### ⚡ 설치 없이 즉시 실행 (npx 권장)

패키지를 전역 설치하지 않아도 `npx`로 바로 실행할 수 있습니다.

```bash
# 1단계: 현재 상태 진단 (읽기 전용, 변경 없음)
npx @nkcroft/unorm --test-git-user

# 2단계: NFD 감지 시 NFC로 자동 치환
npx @nkcroft/unorm --fix-git-user
```

#### 전역 설치 후 실행

```bash
npm install -g @nkcroft/unorm

# 1단계: 현재 상태 진단 (읽기 전용, 변경 없음)
unorm --test-git-user

# 2단계: NFD 감지 시 NFC로 자동 치환
unorm --fix-git-user
```

## Library Usage

### 문자열 변환 (`normalizeString`)

```typescript
import { normalizeString } from '@nkcroft/unorm'

// NFD(자소 분리) 문자열을 NFC로 변환
const nfdString = '한글'
const nfcString = normalizeString(nfdString, 'NFC')

console.log(nfcString) // '한글'
```

### 스트림 변환 (`NormalizeStream`)

대용량 텍스트 파일이나 네트워크 스트림을 처리할 때 유용합니다. 청크 경계에서 한글 자모가 잘리는 현상을 내부적으로 안전하게 처리합니다.

```typescript
import { createReadStream, createWriteStream } from 'node:fs'
import { NormalizeStream } from '@nkcroft/unorm'

const inputStream = createReadStream('input-nfd.txt')
const outputStream = createWriteStream('output-nfc.txt')
const normalizeStream = new NormalizeStream({ form: 'NFC' })

inputStream.pipe(normalizeStream).pipe(outputStream)
```

## Development & Contribution

- **GitHub Repository**: 본 프로젝트는 오픈소스로 운영됩니다.
- **Branch Strategy**: 새로운 작업은 `feat/`, `fix/`, `docs/` 등의 브랜치에서 진행 후 `main`으로 PR을 생성합니다. 실제 배포는 `release` 브랜치 병합 시 자동화된 파이프라인을 통해 이루어집니다.
- **Coding Convention**: **StandardJS** 철학을 엄격히 준수합니다. (세미콜론 미사용, 싱글 쿼트 사용)
- **Commit Convention**: 모든 커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따릅니다.

## License

[MIT](LICENSE)
