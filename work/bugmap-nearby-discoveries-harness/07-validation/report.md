# BugMapHarness 내 주변 발견 검수

2026-11-20. 디자인 시스템 승인 `0d9f3d9e-b894-4fb0-bec1-725024d4c9b0` 확인 후 BugMapHarness Page 1에 편집 가능한 390×844 두 화면을 추가했다. [전체 50:1081](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=50-1081) · [3 km 이내 50:1190](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=50-1190) · [요구사항 대조표](coverage.csv)

## Figma 플레이어에서 직접 확인한 동작

1. [기존 메인 지도에서 시작](https://www.figma.com/proto/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81&scaling=scale-down)해 손잡이 `41:451`을 위로 드래그하면 전체 목록 `50:1081`이 열린다. [진입 캡처](prototype/02-nearby-after-drag.png)
2. 전체에서 ‘3 km 이내’를 누르면 `50:1190`로 전환된다. 4.6 km 왕잠자리는 빠지고 3.0 km 칠성무당벌레는 포함된다. ‘전체’를 누르면 기록 3개가 돌아온다. [3 km 전환](prototype/03-radius-from-all.png) · [전체 복귀](prototype/04-all-from-radius.png)
3. 전체와 3 km 이내 양쪽의 고정 ‘지도 보기’를 눌러 기존 지도 `41:81`에 돌아갔다. 지도에서 패널을 다시 여는 동작도 확인했다. [전체에서 지도 복귀](prototype/05-map-from-all.png) · [3 km 이내에서 지도 복귀](prototype/08-map-from-radius.png)

실제 브라우저에서 마우스 입력 후 목적지 주소가 450ms 이상 지속되는 것을 확인하고 각 화면을 캡처했다. 대표 목록은 높이 442px 안에 카드 3장 또는 2장이 들어간다. 실제 노드에서 목록의 세로 스크롤 설정과 목록 밖의 지도 보기·하단 탭을 대조했다. 기록이 넘치는 경우의 스크롤 동작 자체는 제품에서 확인한다. [플레이어 8개 단계 및 캡처 해시](prototype-runtime.json) · [Figma 연결 5개](../06-figma/prototype-readback.json)

## 화면과 자산

- 실제 두 PNG에서 검색창, 거리 버튼, 목록, 고정 복귀와 네 탭의 순서 및 잘림·겹침을 확인했다. 지도 탭만 선택되며 하단 조작부의 위치가 두 화면에서 같다. 전체 14개, 3 km 이내 13개의 조작 영역은 각각 최소 44×44px다. [전체 PNG](../06-figma/captures/nearby-discoveries-default.png) · [3 km PNG](../06-figma/captures/nearby-discoveries-radius-3km.png)
- 관찰·채집 카드에 곤충명, 사진, 유형, 공개 지역, 발견 일시와 거리를 각각 표시했다. 사진은 승인된 정사각형 PNG를 사용했고 예시의 위치·날짜·거리는 시연용이다. 작은 왕잠자리 썸네일에서 날개와 수초 일부가 겹친다. [사진 출처와 크롭·라이선스](../05-design-system/asset-sources.md)
- Figma는 기존 지도와 동일한 Noto Sans KR Medium/Bold를 사용했다. Pretendard 기준 캡처와 텍스트 자폭·굵기 및 벡터 가장자리가 차이 나지만 사진·조작부·문구는 일치한다. [캡처 구간별 대조](../06-figma/capture-crosscheck.json)

## 보존 및 자동 검사

- 기존 지도 및 로그인 등 세 프레임의 PNG는 제작 전후 SHA-256이 같다. 메인 지도 트리는 손잡이에 추가한 드래그 연결만 제외하면 동일하다. 공식 Mapbox 로고의 모양과 색상도 동일한 지도 PNG로 확인했다. Figma가 새 전체 프레임에 시작점 ‘Flow 1’을 생성했다. [보존 대조](../06-figma/preservation.json) · [네이티브 재조회](../06-figma/fresh-export-check.json)
- `lint:figma`에서 실제 노드 205개와 PNG 채우기 5개를 검사해 이슈 0개였다. Figma가 FIT 채우기에 반환하는 항등 변환을 기본값으로 처리했다. 크롭·회전·위치나 크기를 바꾸는 행렬·이미지 해시 불일치를 회귀 테스트에서 거부함을 확인했다. [Figma 검사](figma-lint.json)
- 390×844 Chromium 웹 검사 2회에서 이슈 0개였고 승인 시안 대비 변경 픽셀 0개였다. 시안에서 측정한 최저 글자 대비는 6.43:1이다. [웹 검사](web-lint.json) · [대비 측정](../05-design-system/render-report.json)

실제 GPS·공개 좌표·반경 상태 공유, 검색 결과·기록 상세, 글자 배율과 화면 읽기 동작은 제품 구현 시 확인한다. [승인 상태표](../03-structure/states.csv) · [발견 사항](issues.csv)

## 회귀 검사

저장소 `npm test` 44개가 모두 통과했다. 기존 메인 지도 Figma 내보내기를 현재 하네스로 다시 검사해 410개 노드와 공식 Mapbox 로고 페인트 12개에서 이슈가 0개임을 확인했다.
