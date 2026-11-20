# BugMap 07 발견 지도 앱 구현

> **For agentic workers:** Use the previously agreed Sol implementation and independent Astra verification.

**목표.** 실제 로그인 또는 세션 복구 후 임시 화면 대신 발견 지도를 연다. 기준은 BugMapHarness Page 1의 [07 · 메인 / 발견 지도](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81)와 [보관된 390×844 시안](../../../work/bugmap-main-map-harness/06-figma/captures/main-map-default.png)이다.

## 범위

- React Native에서 다크 전면 지도, 접힌 하단 패널, 위치·기록 조작부, 읽기 전용 검색과 네 탭을 배치한다. 이 화면의 시안 버튼은 비활성 상태를 전달한다.
- 실제 Mapbox Standard의 야간 스타일과 서울숲 기준 카메라를 연결한다. 웹은 Mapbox GL JS, 네이티브 개발 빌드는 RNMapbox Maps를 사용한다. 두 렌더러는 기존 `EXPO_PUBLIC_BUGMAP_MAPBOX_TOKEN`을 읽고 SDK의 로고와 출처를 조작부 위에 둔다. 지도 자체는 이동과 확대를 지원한다. 토큰 누락·지도 로드 오류에는 명확한 상태를 표시한다.
- 시안의 기록 수와 내 위치는 시연 값이다. 사용자의 실제 기록 또는 위치가 준비되기 전에는 이 표시를 앱 데이터로 렌더하지 않는다.
- 이미 구현된 인증 및 로그아웃은 계속 제공한다. 로그아웃은 시안의 네 탭과 분리된 기존 세션 조작이다.
- 웹 개발 서버의 `?preview=discovery-map`에서 인증을 거치지 않는 시각 검증 경로를 제공한다. 개발 플래그와 웹 플랫폼을 조건으로 하며 일반 로그인 흐름과 사용자 세션에 관여하지 않는다.

## 검증

- [x] 로그인 성공과 세션 복구가 같은 발견 지도 컴포넌트를 렌더하는 것을 코드 리뷰로 확인했다. 일반 웹 주소와 배포용 번들에 미리보기 쿼리를 붙인 주소에서 로그인 화면이 열렸다.
- [x] 웹 390×844·360×800에서 Mapbox 스타일과 실제 타일, 지도 이동·확대, 하단 조작부 위 로고·출처, 비활성 제품 버튼 7개를 확인했다. 출처 버튼을 누르면 Mapbox와 OpenStreetMap 링크가 표시됐다.
- [x] 단위 테스트로 공개 토큰 검증과 지도 오류 상태 전환을 확인했다. 웹에서 Mapbox 스타일 요청을 막자 오류 안내가 표시됐고, 차단을 해제한 뒤 다시 열자 실지도가 표시됐다. 두 화면 크기로 전환했을 때 지도와 SDK 출처가 재배치됐다. 지도 화면이 해제될 때 지도와 크기 옵서버를 정리하는 코드를 확인했다.
- [x] 타입 검사, 전체 테스트 76개, 최종 웹·iOS·Android Metro 번들 및 RNMapbox Expo 플러그인 해석을 확인했다.
- [ ] iOS·Android 개발 빌드에서 실계정 로그인 후 전환, 지도 렌더링·출처·오류 복구를 확인한다.
