# 주변 관찰 기록 패널 Figma 제작

2026-11-24 · BugMapHarness · Page 1

| 상태 | 편집 가능한 프레임 | 네이티브 캡처 | 대응 HTML |
| --- | --- | --- | --- |
| 기록 3건 | [162:1204](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=162-1204) | [390×844 PNG](captures/main-map--cluster-selected.png) | [3건](web/main-map--cluster-selected.html) |
| 4건 이상 · 기록 7건 | [162:1597](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=162-1597) | [390×844 PNG](captures/main-map--cluster-selected-overflow.png) | [7건](web/main-map--cluster-selected-overflow.html) |

## 제작

디자인 시스템 승인 `80fd3cc0-9f6c-40a7-a524-7d9cd5a076c3`와 입력 해시를 대조했다. Cursor MCP Plugin에서 문서명, Page 1, 390×844 메인 지도 `41:81`, 기록 3 마커 `41:394`, 기록 7 마커 `41:390`와 원본 지도의 네이티브 PNG를 확인했다. 개발 플러그인의 파일 키 반환값은 `null`이다. 프로토타입의 문서와 프레임 URL은 승인된 파일 키를 사용한다. [대상 설정](../control/figma.json)

원본 지도의 편집 가능한 지도 벡터, 지명, 마커 인스턴스, 현재 위치와 공식 Mapbox 로고를 새 프레임에서 재사용했다. 제목, 닫기, 목록, 카드 텍스트와 사진을 각각 편집 가능한 레이어로 구성했다. 카드 10개는 자동 레이아웃 [기록 행 컴포넌트 162:1191](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=162-1191)의 인스턴스다. 실제 값 일치가 확인된 기존 색 변수에 채움과 테두리를 연결하고, 패널 전용 변수는 주변 관찰 기록 컬렉션에 추가했다. 사진별 원본 해시, 작가, 라이선스와 기록 ID를 매핑했다. 비정사각형 사진은 원래 비율의 레이어를 80×80 모서리 프레임 안에서 자른다. [네이티브 노드](nodes.json) · [화면 및 이미지 매핑](node-map.json) · [사진 출처](../05-design-system/asset-sources.md)

두 패널은 상단 두 모서리 반경 32px, 사진 80px, 제목 24px, 이름 18px, 날짜 14px다. 3건 패널 높이는 448px, 7건 패널 높이는 468px다. 7건 목록은 제목과 닫기 아래의 362px 높이 세로 스크롤 프레임에서 실제로 잘린다. 처음 세 행 전체와 네 번째 행의 상단 26px, 네 번째 사진의 상단 14px가 보인다. 네 번째 이름과 날짜는 스크롤한 뒤 보인다. 브라우저 시안은 Pretendard를 사용하고 Figma에는 같은 다크 메인 지도에서 쓰는 Noto Sans KR Medium/Bold가 적용됐다. [디자인 토큰](../05-design-system/tokens.json)

## 연결과 검수

- 기존 마커 두 개에서 해당 패널로 진입한다. 각 패널의 닫기는 기존 메인 지도 `41:81`로 돌아간다. 패널 위의 다른 마커를 누르면 해당 패널로 전환한다. Figma 플레이어에서 목록을 끝까지 보고 패널을 다시 열 때 이전 스크롤 위치가 남는 동작을 확인했다. Cursor의 수정 명령에서 Figma 접속 오류가 발생했다. 이어 Figma 편집기의 상태 옵션에서 7건으로 들어가는 두 연결에 스크롤 위치 초기화를 켰다. 실제 플레이어에서 7건을 스크롤한 뒤 3건으로 전환하고 돌아왔을 때와, 닫고 지도에서 7건을 다시 열었을 때 두 경우 모두 목록이 맨 위에서 열렸다. Cursor 내보내기에서 초기화 필드는 표시되지 않아 편집기와 플레이어 검증 증거를 함께 연결했다. [스크롤 초기화 검증](scroll-reset-verification.json) · [Cursor 변경 시도](scroll-reset-repair-attempt.json)
- 기존 지도 출처 버튼의 프로토타입 반응 목록은 비어 있다. 두 선택 화면에서 Mapbox 출처 버튼이 보이며 44×44px 영역을 가진다. 제품 검증에서 두 상태 각각의 SDK 출처 버튼을 눌러 출처 정보가 열리는지 확인한다. 개별 기록의 상세 연결 동작은 제품 명세에 있다. [반응 및 스크롤 속성](prototype-readback.json) · [요구사항](../01-prd/requirements.csv)
- 제작과 분리된 다음 Cursor 조회에서 네이티브 노드 트리, 두 PNG, 마커 연결과 원본 컴포넌트를 다시 읽어 일치함을 확인했다. 두 PNG는 직접 열어 사진·이름·날짜, 선택 마커, 지도 출처, 닫기와 잘림 경계를 대조했다. 내보낸 노드 822개를 읽기 전용 공식 검사 함수로 검수했고 이슈는 0건이다. [재조회 대조](fresh-export-check.json) · [읽기 전용 검사](native-preflight.json)
- 기존 루트 16개를 제작 전후 비교했다. 기존 메인 지도 PNG의 SHA-256은 `3c391df201a8b53222204ba5594e87db41ca6ce24f2b103d50ae5cd54ede9b2c`다. 기존 마커 두 개에 추가한 탭 연결을 제외하고 기존 루트의 노드 구조가 모두 일치한다. [보존 대조](preservation.json)
- Cursor MCP는 작업 전용 임시 명령을 사용했다. 첫 실행은 오류 상세 없이 중단됐으며 원본 프레임과 두 마커 확인 결과 부분 변경이 없었다. 진단을 추가한 다음 실행에서 제작과 재조회가 완료됐다. 플러그인 원본 파일을 복원하고 SHA-256을 대조했다. [제작 도구](cli/README.md) · [복원 확인](cursor-source-restore.json)

실제 Figma 플레이어의 진입·전환·복귀·목록 스크롤과 정확히 네 기록인 HTML의 마지막 행 탭 및 ID 수신 증거는 검증 단계에 모은다. 편집 가능한 대표 프레임의 기록 행은 기본 104px을 사용한다. 큰 글자에서 줄바꿈과 가변 높이가 적용되는 제품 동작은 구현 검수 항목이다.
