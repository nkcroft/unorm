# `@nkcroft/unorm` 프로젝트 기획 문서

## 1. 프로젝트 개요 (Project Overview)

* 패키지명: `@nkcroft/unorm`
* 목표: ICU의 `uconv` 도구에서 영감을 받은, 빠르고 가벼운 `Node.js` 기반 유니코드 정규화(Unicode Normalization) CLI 도구 및 라이브러리 개발.
* 주요 타겟: macOS와 Windows/Linux 간의 파일명 및 텍스트 데이터 교환 시 발생하는 한글 자소 분리(`NFD`) 현상 등을 터미널에서 간단하게 해결하려는 개발자 및 시스템 관리자.

## 2. 기술 스택 (Tech Stack)

* 언어: `TypeScript` (안정적인 타입 지원 및 모던 자바스크립트 생태계 활용)
* 런타임: `Node.js` (v18 이상 권장)
* 주요 의존성 (Dependencies):
    * `commander`: CLI 인터페이스 구축
    * (선택) `chalk` 또는 `picocolors`: 터미널 출력 포맷팅
* 개발 및 빌드 도구 (Dev & Build Tools):
    * `vite`: 라이브러리 및 CLI 빌드 번들러
    * `typescript`: 정적 타입 체킹 및 트랜스파일
    * `eslint` (v9): 코드 린팅 (Flat Config 적용)
    * `vitest`: 유닛 테스트 (빠른 실행 속도 및 TypeScript 기본 지원)
* 핵심 로직: `Node.js` 내장 `String.prototype.normalize()` 및 `stream` API (대용량 파일 처리를 위함)

## 3. 핵심 기능 요구사항 (Core Features)

### A. CLI 기능 (Command Line Interface)

* 파이프(`|`)를 통한 표준 입출력(`stdin`/`stdout`) 스트림 지원.
* 파일 경로를 직접 입력받아 변환된 결과를 새로운 파일로 저장하는 기능.
* 지원 옵션 (Flags):
    * `-v`, `--version`: 패키지 버전 출력
    * `-h`, `--help`: 도움말 및 사용 예시 출력
    * `-f`, `--form <type>`: 변환할 정규화 폼 (기본값: `NFC`, 지원: `NFC`, `NFD`, `NFKC`, `NFKD`, 소문자로도 입력 가능)
    * `-i`, `--input <file>`: 입력 파일 경로 (없으면 `stdin` 사용)
    * `-o`, `--output <file>`: 출력 파일 경로 (없으면 `stdout` 사용)
    * `-t`, `--test <file|string>`: 문자열 테스트 (출력: `NFC`, `NFD` 등)
    * `--fix-git-user`: 자소 분리된(`NFD`) Git 전역 사용자 이름(`user.name`)을 `NFC`로 자동 치환하는 편의 기능

### B. 모듈 API 기능 (Library Output)

* 다른 `Node.js` 프로젝트에서 `import` 또는 `require`로 가져다 쓸 수 있도록 함수형 API 제공.
* 문자열 변환 기능(`normalizeString`)과 스트림 변환 기능(`normalizeStream`) 분리 설계.

## 4. 예상 디렉토리 구조 (Directory Structure)

```plain
@nkcroft/unorm/
├── src/
│   ├── cli.ts          # Commander.js CLI 설정 및 진입점
│   ├── index.ts        # 라이브러리 API 외부 노출 (Export)
│   ├── normalize.ts    # 핵심 정규화 로직 (문자열 처리)
│   └── stream.ts       # 대용량 처리를 위한 Transform Stream 로직
├── bin/
│   └── unorm.js        # npm 패키지 설치 시 실행될 CLI 실행 파일 (Shebang 포함)
├── tests/              # Vitest 기반 테스트 코드
├── package.json
├── tsconfig.json
├── vite.config.ts      # Vite 빌드 및 번들링 설정
├── eslint.config.ts    # ESLint 9 Flat Config 설정 (defineConfig 활용)
└── README.md
```

## 5. 개발 페이즈 (Milestones for Cursor)

* Phase 1: 초기 세팅 및 핵심 로직 구현
    * `vite`, `typescript` 환경 설정 (`vite.config.ts`, `tsconfig.json` 빌드 스크립트 설정).
    * `eslint` (v9) 환경 설정 (`eslint.config.ts` 파일에 `defineConfig`를 활용한 Flat Config 구성 및 `StandardJS` 룰 적용).
    * `src/normalize.ts`에 `String.prototype.normalize`를 활용한 코어 함수 작성.
    * `vitest` 유닛 테스트 세팅 및 한글 `NFD`/`NFC` 변환 테스트 케이스 작성.

* Phase 2: 스트림(Stream) 처리 구현
    * `src/stream.ts`에 `Node.js` `Transform` 스트림을 확장하여 청크(Chunk) 단위로 유니코드를 깨짐 없이 변환하는 로직 구현. (주의: 청크 경계에서 유니코드 문자가 잘리는 현상 방지 로직 필요)
    * 대용량 파일 스트림 변환에 대한 성능(Benchmark) 및 안전성 테스트.

* Phase 3: CLI 인터페이스 연동
    * `commander` 패키지를 연동하여 `src/cli.ts` 작성.
    * `bin/unorm.js`와 연결하여 글로벌 설치 시 `unorm` 명령어가 동작하도록 구성.
    * `--fix-git-user` 등 편의 기능 구현 및 예외 처리 (예: `git` 미설치 시 에러 핸들링).

* Phase 4: 문서화 및 배포 준비
    * `README.md`에 CLI 사용법과 API 사용법 명시.
    * `release` 브랜치 병합 시 동작하는 `GitHub Actions` 기반 CI/CD 파이프라인 (`npm` 자동 배포) 구성.

## 6. 사용 예시 (Usage Examples)

### CLI 환경:

```bash
# 파이프라인을 이용한 변환
cat mac_nfd_text.txt | unorm -f NFC > win_nfc_text.txt
cat mac_nfd_text.txt | unorm > win_nfc_text.txt # default NFC

# 파일을 직접 지정하여 변환
unorm -i mac_nfd_text.txt -o win_nfc_text.txt -f NFC
unorm -i mac_nfd_text.txt -o win_nfc_text.txt # default NFC

# git 사용자 이름 - 테스트
unorm -t "$(git config --global user.name)"
# * Input(9): ㅎㅗㅇㄱㅣㄹㄷㅗㅇ
# * Result: NFD

# git 사용자 이름 - NFC 치환 (부가 기능)
unorm --fix-git-user
# 내부적으로 `git config --global user.name "$(git config --global user.name | unorm)"` 와 동일한 동작을 수행합니다.
```

### Node.js 코드 내부:

```ts
import { normalizeString } from '@nkcroft/unorm'

const nfdString = 'ㅎㅏㄴㄱㅡㄹ'
const nfcString = normalizeString(nfdString, 'NFC')
// '한글'
console.log(nfcString)
```

## 7. 배포 및 버전관리

* `@nkcroft/unorm` -- `npm` `@nkcroft` 조직 하위에 `unorm` 패키지 배포
* **브랜치 전략 (Branch Strategy)**:
    * `main`: 기본 개발 브랜치 (PR 병합용)
    * `release`: 배포용 브랜치 (`main`에서 `release`로 병합 시 배포 파이프라인 트리거)
* GitHub `release-please` 파이프라인에 따라 자동화된 배포 및 버전 관리 진행

## 8. 개발 및 기여 규칙 (Development & Contribution Rules)

* **GitHub 공개 저장소 (Public Repository)**: 본 프로젝트는 누구나 접근하고 기여할 수 있는 오픈소스로 운영됩니다.
* **브랜치 전략 (Branch Strategy)**:
    * 모든 작업은 새로운 기능 브랜치(예: `feat/`, `fix/`, `docs/`)에서 수행합니다.
    * 작업 완료 후 `main` 브랜치로 PR(Pull Request)을 생성하여 병합합니다.
    * 실제 배포는 `main` 브랜치의 변경사항을 `release` 브랜치로 병합할 때 이루어집니다.
* **코딩 컨벤션 (Coding Convention)**: **StandardJS** 철학을 엄격히 준수합니다. (세미콜론(`;`) 미사용, 싱글 쿼트(`'`) 사용, 최소한의 설정 지향)
* **커밋 컨벤션 (Commit Convention)**: 모든 커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따릅니다. (예: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` 등)
