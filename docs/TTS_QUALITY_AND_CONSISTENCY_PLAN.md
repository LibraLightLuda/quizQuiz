# 한국어·영어 듣기 음질 및 기기 일관성 개선 계획

## 1. 결론

현재의 브라우저 `speechSynthesis` 단독 방식은 운영체제, 브라우저, 설치된 음성 엔진과 음성 데이터에 따라 결과가 달라진다. 듣기 학습의 기본 재생 경로를 **검수된 고품질 음성 파일**로 바꾸고, 브라우저 TTS는 장애·오프라인 상황의 보조 수단으로 제한한다.

권장 재생 우선순위는 다음과 같다.

1. 캐시에 저장된 고품질 음성 파일
2. 네트워크에서 받는 고품질 음성 파일
3. 기기 내장 Web Speech TTS
4. 글자 문제 전환

현재 콘텐츠처럼 단어와 이야기 문장이 미리 정해진 앱에서는 음성을 빌드 전에 한 번 생성해 정적 자산으로 배포하는 것이 음질, 비용, 속도, 개인정보, 장애 대응 측면에서 가장 유리하다. 향후 동적 문장이 추가될 때만 서버 측 실시간 합성을 별도 도입한다.

## 2. 현재 상태와 문제 원인

- `src/services/speechService.ts`가 `window.speechSynthesis`의 음성 목록에서 locale이 일치하는 첫 음성을 사용한다.
- `SpeechSynthesisVoice`에는 웹에서 통일해 사용할 수 있는 음질 등급이 없고, 같은 이름의 음성이 모든 기기에 존재하지 않는다.
- iOS에서는 Apple 음성 설치 상태와 Safari 동작에, Android에서는 제조사·TTS 엔진·설치된 음성 데이터와 네트워크 필요 여부에 영향을 받는다.
- 현재 4초 고정 timeout은 짧은 단어와 긴 이야기 문장을 구별하지 않아, 정상 재생 중에도 오류로 처리될 수 있다.
- `rate`, `pitch`, `volume` 값이 같아도 실제 발화 속도와 음색은 엔진마다 다르다.
- PWA 오프라인 모드에서는 기기 음성이 네트워크 음성일 경우 재생을 보장할 수 없다.

## 3. 목표와 성공 기준

### 사용자 목표

- 한국어·영어 듣기에서 자연스럽고 명료한 음성을 기본으로 제공한다.
- 같은 콘텐츠는 iOS와 Android에서 같은 발음, 속도, 음색으로 들린다.
- 네트워크가 불안정해도 이미 학습한 음성은 빠르게 다시 들을 수 있다.
- 고품질 음성이 실패해도 학습 세션이 중단되지 않는다.

### 출시 기준

- 지원 기기에서 고품질 음성 재생 성공률 99% 이상
- 캐시된 단어 음성의 재생 시작 p95 150ms 이하
- 최초 네트워크 재생 시작 p95 1.5초 이하
- 동일 콘텐츠의 iOS·Android 재생 파일 해시 100% 동일
- 한국어·영어 대표 표본의 원어민/교사 검수 통과율 95% 이상
- 오프라인, 느린 네트워크, 재생 취소, 연속 탭에서 세션 멈춤 0건

## 4. 제안 아키텍처

### 4.1 고품질 음성 생성

- Google Cloud, Azure Speech, Amazon Polly 등 한국어와 미국 영어 신경망 음성을 제공하는 후보로 20~30개 대표 문장을 생성한다.
- 서비스 이름을 먼저 정하지 않고, 어린이 학습용 명료도·자연스러움·한국어 고유명사·영어 철자 발음·비용을 기준으로 블라인드 청취 평가한다.
- 언어별 한 개의 기본 음성을 고정하고 `voiceVersion`을 부여한다.
- 단어는 자연 속도에 가까운 0.9~1.0배, 이야기 문장은 0.95~1.0배를 시작점으로 삼는다. 학습 난이도에 따라 음원을 중복 생성하지 않고, 필요하면 클라이언트의 제한된 `playbackRate`만 사용한다.
- 출력은 호환성이 높은 MP3, 모노, 일정한 sample rate/bitrate로 통일한다. 앞뒤 무음 제거와 loudness 정규화를 자동 처리한다.
- 잘못 읽기 쉬운 단어는 SSML 또는 발음 사전으로 교정하며, 교정 규칙을 코드와 함께 버전 관리한다.

### 4.2 정적 오디오와 manifest

예시 구조:

```text
public/audio/
  manifest.v1.json
  ko-KR/v1/words/ko-easy-1.mp3
  en-US/v1/words/en-easy-1.mp3
  ko-KR/v1/stories/<scene-id>.mp3
```

manifest 항목 예시:

```json
{
  "contentId": "en-easy-1",
  "locale": "en-US",
  "voiceVersion": "en-us-learner-v1",
  "url": "audio/en-US/v1/words/en-easy-1.mp3",
  "sha256": "...",
  "durationMs": 820
}
```

- 파일명은 표시 문자열이 아니라 안정적인 콘텐츠 ID를 사용한다.
- 텍스트, locale, 음성, 속도, 생성 설정의 해시가 달라질 때만 다시 생성한다.
- TTS 제공자 비밀키는 브라우저 번들에 넣지 않는다. 생성 스크립트나 보호된 CI 환경에서만 사용한다.
- PR 검증에서 데이터 항목과 manifest의 누락, 중복 ID, 고아 파일, 0바이트 파일을 검사한다.

### 4.3 통합 재생 서비스

기존 `speak(text, lang)` 중심 API를 다음 개념으로 교체한다.

```ts
playSpeech({
  contentId,
  text,
  locale,
  kind: 'word' | 'story',
  preferredSource: 'high-quality' | 'device'
})
```

서비스 내부 책임:

- manifest에서 고품질 파일을 찾고 `HTMLAudioElement`로 재생
- 재생 중복 방지와 이전 요청 취소
- `canplay`, `playing`, `ended`, `error`, timeout 상태를 일관된 결과로 변환
- 파일 미존재·네트워크 오류·디코딩 오류 시 Web Speech로 한 번만 fallback
- 모든 경로 실패 시 현재의 글자 문제 전환 반환
- timeout을 고정 4초가 아니라 `재생 시작 timeout`과 `duration 기반 종료 timeout`으로 분리
- 페이지 숨김, 문제 전환, 설정 변경 시 오디오와 TTS를 모두 정리

### 4.4 캐시와 오프라인

- 필수 단어 음성 또는 첫 학습 세트는 PWA precache 후보로 삼는다.
- 나머지 단어와 이야기 음성은 첫 재생 후 Cache Storage에 저장하는 `CacheFirst` 정책을 사용한다.
- 새 문제를 표시할 때 현재 음성과 다음 문제 후보 1~2개만 미리 받는다.
- 설정에 `오프라인 음성 받기`를 제공한다면 언어별 팩의 예상 용량을 먼저 보여 주고 사용자가 명시적으로 받게 한다.
- 저장 공간이 부족하거나 캐시가 제거되어도 네트워크 재생 또는 기기 TTS로 자연스럽게 내려간다.
- `voiceVersion` 변경 시 새 파일은 새 캐시에 저장하고, 활성 재생이 끝난 뒤 오래된 캐시를 정리한다.

## 5. 사용자 설정과 화면

기존 `듣기 음성` on/off 아래에 다음 설정을 둔다.

- **음성 품질**
  - `고품질(권장)`: 검수된 동일 음성을 사용하고 필요 시 데이터를 받음
  - `기기 음성`: 데이터 사용을 최소화하지만 기기마다 다르게 들릴 수 있음
- **말하기 속도**: `천천히`, `보통`; 고품질 파일은 0.85~1.0 범위 안에서만 재생 속도를 조절
- **음성 미리 듣기**: 한국어와 영어 예문을 즉시 비교
- 선택 사항: `Wi-Fi에서 들은 음성 저장`, `오프라인 음성 관리`

어린이용 기본 화면에는 제공자명이나 음성 모델명을 노출하지 않는다. 보호자/고급 설정에서만 데이터 사용과 저장 용량을 설명한다. 기존 설정은 schema v2로 안전하게 마이그레이션하고, 이전 사용자는 `고품질(권장)`을 기본값으로 받는다.

## 6. 단계별 실행 계획

### 0단계: 측정 기준 확정 (0.5~1일)

- 현재 한국어·영어 단어 수, 이야기 장면/문제 문장 수와 예상 오디오 용량 산정
- 대표 평가 세트 작성: 짧은 단어, 받침/연음, 숫자·기호, 영어 최소대립쌍, 긴 이야기 문장
- 지원 범위 정의: iOS Safari/PWA와 Android Chrome/PWA의 현재 버전 및 직전 주요 버전

산출물: 평가 문장 목록, 기기 매트릭스, 품질 점수표, 용량 예산

### 1단계: 음성 후보 검증 (1~2일)

- 후보 제공자별 동일 문장 샘플 생성
- 한국어·영어 각각 최소 2개 음성 비교
- 성인 평가자와 가능하면 교사/원어민이 자연스러움, 명료도, 속도, 아동 친화성을 5점 척도로 평가
- 언어별 기본 음성과 fallback 음성을 확정

산출물: 선택 근거, 고정 voice ID, SSML/발음 규칙 v1

### 2단계: 생성 파이프라인과 manifest (2~3일)

- 콘텐츠 ID 기반 일괄 생성 스크립트 작성
- 무음 제거, 음량 정규화, MP3 변환, duration/hash 생성
- 누락·중복·발음 예외 검증을 테스트에 추가
- API 키를 로컬 비밀 저장소와 CI secret에서만 읽도록 구성

산출물: 재현 가능한 오디오 생성 명령, manifest, 1차 전체 음원

### 3단계: 앱 재생 계층 전환 (2~4일)

- `audioService` 또는 확장된 `speechService`에 고품질→기기 TTS→글자 문제 fallback 구현
- 학습 단어와 이야기 장면에 `contentId` 전달
- 재생 상태, 취소, 재시도, timeout을 하나의 상태 모델로 통합
- 설정 schema v2 및 품질/속도 UI 추가
- 현재 `다시 듣기`, 이야기 읽어 주기, 페이지 숨김 흐름에 동일 서비스 적용

산출물: 기능 구현, 단위 테스트, 기존 듣기 회귀 테스트

### 4단계: PWA 캐시와 장애 내성 (1~2일)

- 오디오 runtime cache와 버전별 정리 정책 추가
- 느린 3G, 완전 오프라인, 저장 공간 부족, 중간 연결 끊김 시나리오 검증
- 네트워크 실패 시 동일 요청이 반복 폭주하지 않도록 세션 단위 circuit breaker 적용

산출물: 오프라인 동작, 캐시 용량 보고서, fallback 테스트

### 5단계: 실제 기기 품질 검증과 점진 출시 (2~3일)

- iPhone/iPad Safari와 홈 화면 PWA, 주요 Android 제조사 Chrome/PWA에서 실기기 테스트
- Bluetooth/유선 이어폰, 무음 모드, 다른 앱 오디오 간섭, 화면 잠금/복귀 확인
- 고품질 재생 시작 시간, 실패율, fallback 비율만 익명 집계; 학습 문장이나 아동 식별 정보는 전송하지 않음
- 10%→50%→100% 점진 활성화가 가능하도록 feature flag 준비

산출물: 기기별 결과표, 알려진 제한, 출시 승인 기준 통과 보고서

## 7. 테스트 매트릭스

| 영역 | 필수 검증 |
|---|---|
| iOS | Safari/PWA, 현재·직전 주요 버전, 음소거 스위치, 첫 사용자 탭, 화면 전환 |
| Android | Chrome/PWA, Pixel·Samsung 최소 각 1대, TTS 엔진 변경/미설치 상태 |
| 네트워크 | Wi-Fi, 느린 연결, 중간 끊김, 완전 오프라인 |
| 재생 | 첫 듣기, 다시 듣기 연타, 문제 전환 중 취소, 긴 이야기, 이어폰 연결 변경 |
| 캐시 | 최초 다운로드, 재방문, 버전 갱신, 저장 공간 부족, 캐시 삭제 후 복구 |
| 접근성 | 화면 읽기 도구와 버튼 이름, 글자 문제 전환, 애니메이션 감소 설정 |

자동 테스트에서는 실제 소리를 평가하지 않고 소스 선택, 상태 전이, timeout, fallback, 캐시 hit/miss를 검증한다. 실제 음질과 플랫폼 오디오 정책은 실기기 수동 테스트로 승인한다.

## 8. 주요 위험과 대응

- **앱 용량 증가:** 전체 precache 대신 핵심 세트와 재생 후 캐시를 분리하고, 다운로드 팩은 선택형으로 둔다.
- **음성 제공자 변경:** 앱은 provider가 아닌 manifest와 파일만 보게 하여 교체 영향을 생성 파이프라인에 격리한다.
- **발음 오류:** 자동 생성 완료를 출시 완료로 보지 않고 발음 예외 목록과 사람 검수를 필수화한다.
- **비용 증가:** 고정 콘텐츠는 한 번만 생성하고 CDN/정적 호스팅한다. 런타임 합성 호출을 하지 않는다.
- **오디오 자동재생 제한:** `시작` 또는 `다시 듣기` 같은 사용자 동작에서 오디오를 활성화하고, 자동재생 실패 시 버튼을 유지한다.
- **오래된 파일 혼재:** manifest와 캐시 이름에 `voiceVersion`을 포함하고 원자적으로 교체한다.

## 9. 의사결정 제안

1차 구현 범위는 **단어 듣기 전체 + 이야기 장면 읽기**로 잡는다. 제공자는 1단계 블라인드 평가 후 정하고, 앱 코드에는 제공자 종속 SDK를 넣지 않는다. 설정 기본값은 `고품질(권장)`으로 하되, 데이터 절약이 필요한 사용자는 `기기 음성`을 선택할 수 있게 한다.

이 구조라면 iOS/AOS 버전과 내장 TTS 엔진의 차이는 기본 경험에서 제거되고, 기기 TTS의 장점인 오프라인·무료 동작은 비상 fallback으로 유지된다.

## 참고 자료

- [W3C Web Speech API](https://w3c.github.io/speech-api/speechapi.html)
- [MDN `voiceschanged` 이벤트](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event)
- [Android `TextToSpeech.Engine`](https://developer.android.com/reference/android/speech/tts/TextToSpeech.Engine)
- [Android TTS `Voice`](https://developer.android.com/reference/android/speech/tts/Voice)
- [Apple Speech synthesis](https://developer.apple.com/documentation/avfoundation/speech-synthesis)
- [Google Cloud TTS 지원 음성](https://cloud.google.com/text-to-speech/docs/voices)
- [Azure Speech TTS 개요](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech)
- [Amazon Polly Neural voices](https://docs.aws.amazon.com/polly/latest/dg/neural-voices.html)
