# BugMap 첫 로그인 앱 화면 구현

> **For agentic workers:** Use the previously agreed Sol implementation and independent Astra verification. Keep the existing authentication contract.

**목표.** 먼저 열린 로그인 화면을 BugMapHarness 05의 다크 디자인과 지도 구성에 맞춘다. 기존 소셜 로그인과 정책 링크를 앱 컴포넌트에서 재사용한다.

**화면 기준.** 원본 390×844 Figma 캡처와 핸드오프를 시각 기준으로 삼는다. BugMap 로고, 두 줄 제목, 설명, 서울숲 관찰 예시, 버튼과 밑줄 정책 링크 순서로 구성한다. 좁은 화면이나 큰 글자에서는 스크롤을 허용한다. 앱에 확정된 카카오·Google 및 iOS Apple 제공자, 로딩·오류·취소 상태를 유지한다.

**지도.** 기본 배경은 승인된 시안의 지도 일러스트 자산이다. 기존 Mapbox Standard 실데이터 캡처는 앱 패키지의 정적 자산으로 배포하지 않는다. `EXPO_PUBLIC_BUGMAP_MAPBOX_TOKEN`이 설정된 경우 앱이 Mapbox Static Images API로 직접 서울숲 이미지를 요청한다. Standard 미지원으로 정적 지도에는 `dark-v11`을 사용하며 중심은 경도 127.039·위도 37.5425, 줌 14다. Mapbox가 표시되는 경우 공식 로고와 © Mapbox, © OpenStreetMap, Improve this map 링크가 보이게 한다. 로드 실패에는 일러스트로 되돌아간다. [출처 표시](https://docs.mapbox.com/help/dive-deeper/attribution/) · [Static Images API](https://docs.mapbox.com/api/maps/static-images/)

## 검증

- [x] 로그인 화면을 기존 앱 진입점에서 열고 웹 390×844·360×800에서 화면 배치, 읽기 순서와 두 정책 링크를 확인한다.
- [x] Mapbox 요청 URL 생성과 유효하지 않은 토큰 처리를 검증한다. Mapbox 이미지를 표시할 때 로고와 출처가 가려지지 않는지 확인한다.
- [x] 로딩·취소·로그인 실패와 기존 정책 동작이 회귀하지 않는지 확인한다. Google 실계정 재검증은 보류한다.

## 검증 기록

- Figma 05를 원래 구성으로 복구했다. 390×844 PNG를 내보내 보관된 시안 PNG와 바이트가 모두 일치하는 것을 확인했다.
- 앱의 390×844·360×800 웹 미리보기에서 두 정책 링크를 각각 눌렀고 게시 준비 상태에 진입·복귀했다. 실제 Mapbox PNG는 HTTP 200으로 받았고 지도 표시 중 로고와 세 링크를 확인했다. 웹 QA에서 글자를 두 배로 키워 스크롤했을 때도 출처가 고정됐고, 요청 실패 시 일러스트가 보였다.
- 전체 테스트 72개와 타입 검사, 웹·iOS·Android 번들 생성이 통과했다. Astra가 단위 테스트 28개와 출처·접근성을 독립 점검했다. 실기기와 실제 계정 OAuth 검증은 후속이다.
