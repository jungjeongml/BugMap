# 메인 발견 지도 최종 검수

2026-11-20. 대상은 BugMapHarness Page 1의 390×844 `main-map/default` 한 장이다. 디자인 시스템 승인 `b95f6ebe-352d-4004-9602-93da1a83250f`에 연결된 화면을 검수했다. [Figma 41:81](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81) · [저장된 실제 Figma 캡처](../06-figma/captures/main-map-default.png) · [승인 시안](../05-design-system/captures/390x844-default.png)

## 자동 검사

- `lint:figma`는 실제 내보내기 노드 410개에서 이슈 0건이다. 로고 `41:819`의 공식 자산 파일·매니페스트·원본 SHA-256과 벡터 기하를 확인했다. 흰색·검정 채움과 윤곽선 12개의 순서 및 불투명도를 확인했다. 로고 SVG와 Figma 내보내기 파일, 화면 PNG는 보정 완료 시점의 바이트를 유지한다. [Figma 검사](figma-lint.json) · [로고 매핑](../06-figma/node-map.json)
- `lint:web`은 로컬 HTML 한 장을 임시 Chromium의 390×844에서 렌더해 이슈 0건을 기록했다. 승인 PNG 대비 허용 임계값을 초과한 픽셀은 0개다. [웹 검사](web-lint.json) · [Chromium 캡처](captures/a557daf8e0e4-390x844.png)

## 실제 Figma 화면 검수

승인 시안과 저장된 390×844 Figma PNG를 직접 열고 요구사항 8개를 대조했다. 전체 지도, 총 건수 배지, 현재 위치, 가려지지 않은 Mapbox 로고·출처 버튼, GPS·기록, 검색창과 네 탭을 확인했다. 캡처에서 글자와 컨트롤이 배경과 구분되며 잘림이나 겹침은 보이지 않았다. 승인 시안 검사에서 가장 낮은 글자 대비는 5.01:1이었다. 저장한 Figma PNG의 대비는 육안으로 검수했다. 노드에서 조작 영역 12개가 최소 44×44px이고 지도 탭만 선택되어 있음을 확인했다. 기존 `7:2`와 `19:2`는 제작·보정 전후의 트리 및 PNG 해시가 일치한다. [요구사항별 결과](coverage.csv) · [원격 보존 기록](../06-figma/preservation.json)

Figma PNG와 승인 PNG를 직접 비교한 결과 RGB 채널 차이가 16을 넘는 픽셀은 8,930개(2.71%)다. Noto Sans KR 대체 글꼴과 지도 레이블 외곽선의 차이가 보인다. 웹 캡처는 승인 SVG 기반의 대응 산출물이므로 그 픽셀 결과는 별도로 기록했다. [이슈 목록](issues.csv)

검수 범위는 저장된 Figma 원격 노드와 캡처의 정적 기본 화면이다. 2026-11-20에 다시 연결을 시도했으나 Cursor MCP 채널이 응답하지 않았고 공식 Figma 도구에서 호출 한도에 도달했다. 이 작업에서는 Figma 프레임에 쓰지 않았다. 실제 드래그·검색·GPS·지도 동작과 다른 기기 크기는 구현 검증 범위다. 최종 점수와 단계 승인은 사람이 CLI로 기록한다.
