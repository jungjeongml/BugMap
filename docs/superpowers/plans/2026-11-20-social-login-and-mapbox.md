# BugMap 소셜 로그인과 Mapbox 배경 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Work from the contract below and use focused regression tests.

**Goal:** BugMapHarness의 로그인 화면에 메인 Mapbox와 같은 스타일을 쓰는 정적 배경을 넣고, 앱과 개발용 서버를 연결해 카카오·Google·iOS Apple 로그인 경로를 제공한다.

**Architecture:** 앱에서 시스템 인증 세션을 열고 서버가 제공자 콜백과 자격 증명을 검증한다. 서버에서 발급한 1회용 앱 코드와 PKCE 검증값을 교환한다. 액세스 토큰은 메모리, 갱신 토큰은 기기 보안 저장소에 둔다.

**Tech Stack:** Expo React Native, Expo Crypto·SecureStore·WebBrowser, NestJS, SQLite 개발 저장소, Cursor Talk to Figma MCP, Mapbox GL JS.

## 공통 계약

- 제공자 ID는 `kakao`, `google`, `apple`이다. 카카오와 Google은 iOS·Android, Apple은 iOS에서 표시한다.
- 앱의 반환 주소는 `bugmap://auth/callback`이다. 서버는 이 주소를 정확히 허용한다. 제공자 콜백 주소는 서버가 관리하는 `/v1/auth/callback/:provider` HTTPS 주소다.
- 앱이 `GET /v1/auth/authorize/:provider?redirect_uri=...&state=...&code_challenge=...&code_challenge_method=S256`을 시스템 브라우저에서 연다. 앱의 state와 서버가 제공자에게 보내는 독립 state는 별개다.
- 앱으로 돌아올 때 성공은 `code`와 `state`, 실패는 `error`와 `state`를 쓴다. 앱은 URI와 state를 대조한다. 토큰은 앱 콜백 URL에 싣지 않는다.
- `POST /v1/auth/exchange`는 JSON `{provider, code, redirectUri, codeVerifier}`를 받는다. 응답은 `{accessToken, refreshToken, userId}`다.
- `POST /v1/auth/refresh`는 `{refreshToken}`을 받고 회전 후 같은 응답을 돌려준다. `POST /v1/auth/logout`는 `{refreshToken}`의 서버 세션을 폐기한다. 유효하지 않은 세션은 HTTP 401을 돌려준다.
- 정책 링크를 게시 전 상태로 유지한다. 실서비스 검증은 HTTPS 개발 주소와 제공자 앱 등록이 준비된 뒤 수행한다.

## 작업 1 — Figma

- [x] BugMapHarness Page 1의 로그인 `19:2`와 지도 참조 `41:81`을 확인한다.
- [x] Mapbox GL JS의 메인 프로토타입 스타일 설정을 사용해 서울숲·성수동 카메라의 정적 배경을 캡처한다. Mapbox 로고와 출처는 읽을 수 있게 둔다.
- [x] 로그인 지도 레이어에 스냅샷을 채우고 Google 공식 버튼으로 교체한 뒤 Figma에서 다시 내보낸다.

## 작업 2 — 앱

**수정 범위:** 루트 앱·패키지·환경 예시, `src/features/auth/`의 인증 클라이언트·UI·테스트.

- [x] 앱 콜백 URI·state, URL 구성과 교환, 취소, 만료와 네트워크 재시도를 테스트한다.
- [x] Expo 시스템 인증 창, 기기 보안 저장소, 플랫폼별 제공자, 인증 후 진입 및 로그아웃을 연결한다. 기존 정책 링크를 재사용한다.
- [x] 타입 검사와 앱 테스트를 실행한다.

## 작업 3 — 개발용 인증 서버

**수정 범위:** `server/` 전체.

- [x] 제공자 state, Apple·Google 토큰 검증, Kakao 사용자 확인, 완료 코드 1회 사용, 앱 PKCE 검증, 로그인 세션 회전·폐기와 동일 이메일 계정 분리를 테스트한다.
- [x] `server/.env.example`와 로컬 실행·제공자 콜백 등록 방법을 작성한다. 서버 비밀값은 서버 환경에서만 읽는다.
- [x] 인증 서버의 테스트·타입 검사와 루트 앱 계약을 대조한다.

## 검증 기록

- Cursor MCP에서 BugMapHarness 로그인 프레임 `19:2`를 다시 내보냈다. 지도 `19:3`, Google `19:70`, 정책 링크 `80:1815`와 Mapbox 로고·출처를 확인했다.
- Sol 구현과 Astra 독립 검증에서 앱 인증·정책 테스트 24개와 서버 테스트 11개, 양쪽 타입 검사가 통과했다. 실제 앱 클라이언트와 로컬 서버를 연결해 제공자 응답을 대체한 로그인, 갱신, 보호 API, 로그아웃 후 접근 거부를 확인했다.
- Expo가 웹·iOS·Android 번들을 생성했다. 서버 런타임 의존성을 NestJS 11.2.11로 갱신한 뒤 `npm audit --omit=dev`에서 취약점 0건을 확인했다. 전체 앱 테스트에서 기존 디자인 하네스의 Chromium 검사 2건은 시간 초과와 기준 이미지 누락으로 실패했다.
- [개발용 서버 설정](../../../server/README.md)에 HTTPS 및 제공자 등록 방법을 정리했다. 실제 계정과 네이티브 기기에서 로그인 왕복 및 보안 저장소 검증은 남아 있다.
