# BugMapHarness 내 주변 발견 제작 기록

2026-11-20에 디자인 시스템 승인 `0d9f3d9e-b894-4fb0-bec1-725024d4c9b0`를 확인하고 기존 BugMapHarness의 Page 1에서 제작했다. 기존 Cursor MCP Plugin의 승인된 작업 전용 임시 명령을 사용했다. Figma 공식 연결은 세션을 열었으나 Starter 호출 제한으로 파일 조회와 라이브러리 조회를 제공하지 않았다.

## 새 프레임과 연결

| 상태 | 편집 가능한 Figma 프레임 | 실제 390×844 PNG |
| --- | --- | --- |
| 전체 | [50:1081](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=50-1081) | [전체](captures/nearby-discoveries-default.png) |
| 3 km 이내 | [50:1190](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=50-1190) | [3 km 이내](captures/nearby-discoveries-radius-3km.png) |

- 메인 지도 `41:81`의 기존 손잡이 `41:451`에서 위 방향 이동 전환을 적용한 드래그 연결을 추가했다. 두 화면의 ‘지도 보기’, 전체 화면의 ‘3 km 이내’, 3 km 화면의 ‘전체’를 연결했다. [기존 메인 지도](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81) · [5개 연결 속성](prototype-readback.json)
- 기존 지도 색상 변수 16개를 재사용하고 기록 카드 바탕·선과 고정 하단 바탕에 변수 3개를 추가했다. 6개 원본 컴포넌트에서 카드, 검색, 지도 복귀와 하단 탭 인스턴스를 만든다. 각 텍스트·아이콘·사진·구성 요소를 Figma 레이어에서 편집할 수 있다. [노드 내보내기](nodes.json)
- 실제 데스크톱 환경에서 제공되는 Noto Sans KR Medium/Bold를 사용했다. 기존 Figma 지도와 같은 한국어 대체 서체다. 데스크톱 PNG와 Pretendard로 렌더한 승인 시안에는 글리프와 벡터 가장자리의 차이가 있다. [비교 수치](capture-crosscheck.json)
- 각 목록은 `VERTICAL` 스크롤을 설정한 390×442 프레임이고 하단 지도 복귀와 탭은 그 스크롤 영역 밖에 있다. 390×844 대표 데이터의 카드 3장과 2장은 각각 목록 높이 안에 들어간다. 위치 확인·검색 적용·실시간 데이터 및 주소 대상의 상세 연동은 제품 동작에서 확인한다. [승인된 구조](../03-structure/flows.mmd)
- 승인한 정사각형 PNG 3종을 카드 이미지에 FIT로 사용했다. 원본 컴포넌트 설명과 자산 문서에 작가, 원출처, 라이선스, 크롭 및 크기 조정 정보를 남겼다. [이미지 매핑](node-map.json) · [사진 출처](../05-design-system/asset-sources.md)

## 실제 캡처와 보존

- 두 네이티브 PNG를 직접 확인했다. 검색, 거리 칩, 기록 목록 순서와 고정 지도 보기 및 네 탭을 두 화면에서 대조했다. 기본의 기록 3개가 3 km 이내에서 2개로 바뀌고 3.0 km 경계 기록을 포함한다. 각각 주요 조작 영역 14개와 13개가 최소 44×44px다. 왕잠자리 사진은 작은 크기에서 수초와 날개가 일부 겹친다.
- 새 파일을 만들거나 기존 프레임을 이동하지 않았다. 기존 `7:2`와 `19:2`의 내보낸 노드 구조와 PNG가 모두 일치했다. 메인 지도 `41:81`의 실제 PNG SHA-256 `3c391df201a8b53222204ba5594e87db41ca6ce24f2b103d50ae5cd54ede9b2c`는 변경 전후 같고, 새 손잡이 연결을 제외한 노드 구조도 일치했다. Mapbox 공식 로고를 포함한 기존 지도 내용은 동일한 PNG로 확인했다. [보존 대조](preservation.json)
- 작성 전 페이지에 프로토타입 시작점이 없었다. Figma가 첫 연결을 추가할 때 새 전체 프레임에 `Flow 1`을 자동 생성했다. 기존 시작점은 없었고 기존 프레임에 수동으로 시작점을 추가하지 않았다.
- 제작 후 다시 연결해 읽기 전용으로 전체 트리·캡처·이미지 5개 매핑·프로토타입 연결 5개를 대조했다. 첫 내보내기와 일치한다. [실제 재조회](fresh-export-check.json)
- 첫 제작 시도는 Figma 데스크톱이 스크롤 값의 다른 API 표기를 요구해 중단됐다. 실제 다시 읽어서 기존 세 프레임, 손잡이의 비어 있는 연결 및 새 프레임 없음이 유지됐음을 확인했다. 실제 값에 맞춘 뒤 재실행했고 네이티브 제작과 내보내기를 완료했다. [재현 도구](cli/README-cursor.md)

프로토타입 연결 속성은 실제 Figma에서 읽었다. 프로토타입 뷰어 조작 증거는 별도의 검증 단계에 기록한다.

Cursor 제작 연결의 `code.js`와 `ui.html`을 백업한 원본으로 복원하고 SHA-256 일치를 확인했다. 실제 플레이어에서 드래그, 거리 선택과 전체 복귀, 두 지도 보기 복귀를 조작해 확인했다. [연결·복원 해시](cursor-source-restore.json) · [실제 조작 검수](../07-validation/report.md) · [독립 제작 비평](critique.md)
