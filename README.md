# 어린이 학습 놀이터

초등학생이 수학·한국어·영어를 학습하는 모바일 우선 PWA입니다. 별도 서버, 회원가입, API 키 없이 정적 파일만으로 동작하며 GitHub Pages 하위 경로와 오프라인 사용을 지원합니다.

## 지원 기능

- 수학: 덧셈, 뺄셈, 곱셈, 세 연산이 섞인 사칙연산과 4단계 난이도별 수 범위
- 한국어: 완성형 음절 또는 음절 묶음 빈칸 문제와 한국어 듣기
- 영어: 글자 또는 철자 묶음 빈칸 문제와 영어 듣기
- 쉬움·보통·어려움은 난이도별 3~4개 보기, 도전은 숫자·글자 직접 입력
- 모든 학습은 항상 15문제이며 문제마다 제한 시간 30초
- 정답 축하 효과, 부드러운 오답 안내, 연속 정답 칭찬
- 효과음, TTS, 애니메이션 설정과 최근 완료 기록 20개 로컬 저장
- iOS/Android safe area, 키보드, 동작 줄이기, 가로 화면 대응
- 설치 가능한 PWA와 오프라인 앱 캐시

## 로컬 실행

Node.js 24 이상과 npm이 필요합니다.

```bash
npm install
npm run dev
```

터미널에 표시된 로컬 주소를 브라우저에서 엽니다.

프로덕션 빌드와 테스트:

```bash
npm test
npm run build
npm run preview
npm run test:pwa
```

브라우저 E2E 테스트는 최초 한 번 Chromium 설치가 필요할 수 있습니다.

```bash
npx playwright install chromium
npm run test:e2e
```

## GitHub Pages 배포

1. 이 폴더를 GitHub 저장소에 push합니다.
2. GitHub 저장소의 **Settings → Pages**로 이동합니다.
3. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
4. `master` 또는 `main` 브랜치에 push하면 `Deploy learning PWA to GitHub Pages` 작업이 테스트·빌드·배포를 수행합니다.
5. 완료 후 Pages에 표시된 주소를 엽니다.

워크플로가 저장소 이름을 읽어 Vite와 PWA의 base path를 자동으로 `/<RepositoryName>/`으로 설정합니다. `owner.github.io` 저장소만 `/`를 사용합니다. 소스 코드에서 asset 루트 경로를 직접 가정하지 않습니다.

## PWA 설치

- Android Chrome/Edge: 브라우저 메뉴에서 **앱 설치** 또는 **홈 화면에 추가**를 선택합니다.
- iPhone/iPad Safari: 공유 버튼을 누르고 **홈 화면에 추가**를 선택합니다.
- 데스크톱 Chrome/Edge: 주소 표시줄의 설치 아이콘 또는 브라우저 메뉴를 사용합니다.

최초 한 번 온라인으로 앱을 연 뒤 앱 파일이 캐시됩니다. 이후 수학·빈칸 학습과 로컬 설정은 오프라인에서도 사용할 수 있습니다. TTS 음성은 기기 음성 제공 방식에 따라 오프라인에서 제한될 수 있으며, 앱에서 글자 문제로 전환할 수 있습니다.

## 단어 추가와 수정

한국어는 [`src/data/koreanWords.ts`](src/data/koreanWords.ts), 영어는 [`src/data/englishWords.ts`](src/data/englishWords.ts)에 있습니다. UI 코드와 분리되어 있습니다.

각 파일의 난이도별 seed 배열에 다음 형식으로 항목을 추가합니다.

```ts
// 한국어: [단어, 아이가 이해할 힌트, 카테고리, 선택적 이모지]
['우체통', '편지를 넣는 상자', '생활', '📮']

// 영어: [소문자 단어, 한국어 뜻, 카테고리]
['planet', '행성', 'nature']
```

마스크 위치는 단어 길이와 난이도에 따라 자동 생성됩니다. 난이도를 바꾸려면 항목을 `easy`, `normal`, `hard`, `challenge` 중 원하는 배열로 옮깁니다. 추가 후 반드시 다음 검증을 실행합니다.

```bash
npm run validate:data
npm test
```

각 언어는 난이도마다 최소 30개 단어를 유지해야 합니다. 영어 표제어는 소문자 `a-z` 한 단어만 사용하고, 한국어는 완성형 음절로 작성합니다.

## 난이도 규칙 변경

- 공통 표시명과 보기 수: `src/domain/difficulty.ts`
- 수학 범위와 오답: `src/domain/mathGenerator.ts`
- 한국어·영어 마스크와 유사 오답: `src/domain/languageGenerator.ts`
- 문제 수와 시간 제한: `src/domain/difficulty.ts`의 `SESSION_LENGTH`, `QUESTION_TIME_SECONDS`

난이도 규칙을 바꿀 때는 `IMPLEMENTATION_SPEC.md`의 범위와 일치시키고 생성기 테스트를 함께 수정합니다.

## 프로젝트 구조

```text
src/
├─ app/        앱 화면, reducer, 핵심 상태
├─ data/       한국어·영어 단어 데이터
├─ domain/     문제 생성기, 난이도, 타입, 검증
├─ services/   로컬 저장, TTS, 효과음, 난수
├─ styles/     모바일 우선 전역 스타일
└─ test/       테스트 환경 설정
tests/e2e/     브라우저 전체 흐름 테스트
public/icons/  PWA 및 iOS 앱 아이콘
.github/workflows/deploy-pages.yml  GitHub Pages 자동 배포
```

제품과 구현의 기준 문서는 [`IMPLEMENTATION_SPEC.md`](IMPLEMENTATION_SPEC.md)입니다.
