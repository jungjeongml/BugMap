### 개발 기준 화면

로그인 후 발견 지도에서 기록 묶음을 누르면 지도와 선택 마커를 남기고, 하단 검색·탭 자리에 주변 관찰 기록 패널을 연다. 닫으면 같은 카메라에서 하단 검색·탭과 GPS·기록 작성 조작부가 돌아온다. [지도에서 시작하는 프로토타입](https://www.figma.com/proto/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81&scaling=scale-down) · [제품 화면 명세](../../../docs/screens/main-map.md#기록-묶음-선택)

| 상태 | 기존 진입 마커 | 편집 가능한 Figma 프레임 | 390×844 실제 캡처 |
| --- | --- | --- | --- |
| `main-map/cluster-selected` · 3건 | `41:394` | [162:1204](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=162-1204) | [세 행 전체](../06-figma/captures/main-map--cluster-selected.png) |
| `main-map/cluster-selected-overflow` · 4건 이상, 7건 시연 | `41:390` | [162:1597](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=162-1597) | [네 번째 행 윗부분](../06-figma/captures/main-map--cluster-selected-overflow.png) |

### 요구사항과 구현 연결

| 요구사항 | 참고할 Figma 노드와 컴포넌트 | 구현 기준 |
| --- | --- | --- |
| CLUSTER-01 | 메인 지도 `41:81`, 선택 화면 `162:1204`·`162:1597`, `clusterMarker`·`clusterPanel` | 기존 지도 위에 선택 패널을 배치하고, 선택한 묶음은 강조 윤곽과 선택 상태로 표시한다. |
| CLUSTER-02 | 제목 `162:1540`·`162:1933`, `recordRow` | `이 주변 관찰 기록 {count}건`에 현재 선택의 공개 기록 건수를 표시한다. 사진·곤충 이름·실제 발견 날짜를 한 행에 묶는다. 이름 미확인 문구는 `이름 모름`이다. |
| CLUSTER-03 | 반복 행 원본 `162:1191`, 목록 `162:1549`·`162:1941` | 행의 키와 상세 진입 값은 각각의 `recordId`다. 공개 좌표가 같아도 행과 상세를 각각 유지한다. 상세에는 기존 전체 사진과 메모를 표시한다. |
| CLUSTER-04 | 닫기 `162:1541`·`162:1934`, 마커 전환 `162:1510`·`162:1899` | 묶음을 바꾸면 선택 강조·건수·목록을 함께 전환하고 스크롤을 첫 행으로 돌린다. 패널을 닫고 다시 열 때도 첫 행에서 시작한다. 상세에서 돌아올 때는 진입 전 카메라·선택·목록 문맥을 복원한다. |
| CLUSTER-05 | SDK 출처 위치 기준 `162:1532`·`162:1925`, `mapAttribution` | 실제 패널 높이와 안전 영역을 반영해 SDK 로고와 출처 조작부를 패널 위에 둔다. 출처 조작부는 시안 기준 44×44px이다. |
| CLUSTER-06 | 두 화면, 반복 행 원본 `162:1191` | 프레임·캡처·이미지 대응은 [노드 매핑](../06-figma/node-map.json), 편집 레이어와 색 변수 바인딩은 [네이티브 노드](../06-figma/nodes.json), 행 구조는 [반복 행 컴포넌트](../06-figma/record-row-component.json)에서 확인한다. 기존 지도와 두 마커의 진입 연결은 [Figma 제작 기록](../06-figma/change-log.md)에 있다. |
| CLUSTER-07 | 목록 `162:1549`·`162:1941`, `recordList`·`recordRow` | 기준 화면에서 3건은 세 행 전체가 보인다. 4건 이상은 세 행과 네 번째 카드 상단 26px가 보인다. 제목과 닫기는 고정하고 목록을 스크롤해 마지막 행 전체를 하단 안전 영역 위에서 읽고 누를 수 있게 한다. |

[승인 수용 기준](../01-prd/requirements.csv) · [화면 상태](../03-structure/states.csv) · [상태 전환](../03-structure/flows.mmd) · [문구](../05-design-system/copy.json)

### 데이터, 지도 및 전환

- 지도 레이어와 선택 목록은 같은 공개 기록 집합을 사용한다. GPS나 지도 핀을 통해 위치를 등록한 기록도 공개 위치가 있을 때 지도 규칙을 적용한다. 위치 없이 저장한 기록은 `내 기록`에서 확인하고 지도와 묶음 건수에서는 제외한다. 묶음을 열 때 별도 위치 권한 요청을 시작하지 않는다. [제품 PRD의 MAP-03·MAP-06·MAP-07](../../../docs/PRD.md#5-기능-요구사항) · [지도 TDD](../../../docs/TDD.md#지도-표시와-내-주변-반경)
- 구현 출발점은 기존 [발견 지도 화면](../../../src/features/discovery-map/DiscoveryMapScreen.tsx)과 플랫폼별 [네이티브 지도](../../../src/features/discovery-map/DiscoveryMapSurface.native.tsx)·[웹 지도](../../../src/features/discovery-map/DiscoveryMapSurface.web.tsx)다. 연결 시 화면에서 현재 선택과 패널을 제어하고 지도 표면은 그대로 유지해 카메라를 보존한다. 패널 측정 높이에 맞춰 기존 `ornamentInset` 흐름을 활용할 수 있다. 해당 소스는 구현 위치 참고용이다.
- 조회를 비동기로 붙일 때는 현재 선택에 해당하는 응답만 목록에 반영한다. 로딩·빈 결과·실패 상태에서도 닫기 또는 다른 묶음 선택 경로가 있어야 한다. 상태별 문구, 조회 연결과 갱신 방식은 후속 앱 설계에서 확정한다. [화면 상태의 loading·empty·error](../03-structure/states.csv)

### 치수, 접근성, 자산

- 기본 글자 크기의 390×844에서 3건 패널은 `y=396`, 높이 448px이며 목록은 `y=468–810`이다. 4건 이상 패널은 `y=376`, 높이 468px이며 목록은 `y=448–810`이다. 행은 358×104px, 행 간격은 8px, 사진은 80×80px다. 패널 상단 모서리는 32px, 행은 16px, 사진은 12px다. 네 번째 행은 카드 상단 26px와 사진 상단 14px를 노출한다. 제목 24px Bold, 이름 18px Bold, 날짜 14px Medium을 적용한다. [승인 토큰](../05-design-system/tokens.json) · [상태별 컴포넌트](../05-design-system/components.json)
- 실제 기기의 안전 영역과 글자 배율로 목록 높이를 계산한다. 제목과 이름은 줄바꿈을 허용하고 행을 내용에 맞춰 늘린다. 마지막 행까지 스크롤할 수 있어야 한다. 닫기는 시안 기준 48×48px, 실제 조작 영역은 닫기·행·출처 모두 최소 44×44px다. 행을 이름·발견 날짜가 포함된 하나의 조작으로 읽고, 선택 마커의 상태와 포커스를 구분한다. 패널을 닫을 때 진입 마커로 포커스를 돌린다. [320×700 Chromium 검증](../07-validation/report.md#작은-화면과-큰-글자) · [컴포넌트 상태](../05-design-system/components.json)
- 앱 디자인 서체는 Pretendard다. Figma 검수본은 기존 지도와 같은 Noto Sans KR Medium/Bold를 사용했다. 닫기와 상세에는 `lucide-react-native`의 `X`와 `ChevronRight`를 사용하고, 실제 지도 출처는 SDK 조작부를 사용한다. [아이콘 출처](../05-design-system/icons.csv) · [검증 보고서](../07-validation/report.md)
- 동봉한 일곱 사진은 시연 데이터의 원본 크롭과 바이트가 같다. 예시 날짜·좌표·ID는 시연 값이다. [인계 자산과 사용 조건](assets/README.md) · [사진·기록 ID 대응](../05-design-system/photo-sources.json)

### 인계 확인

Figma 플레이어에서 두 마커의 진입과 닫기, 7건 목록 스크롤, 선택 전환 및 재진입의 목록 초기화를 확인했다. 같은 치수를 사용한 정확히 4건인 HTML에서는 마지막 행 탭으로 `record-overflow-demo-04`를 받았다. 320×700 Chromium에서는 글자 100%와 200%에서 긴 이름과 전체 목록 접근을 확인했다. Figma 검사 822개 노드와 웹 검사 두 화면에서 이슈 0건이었다. [검증 보고서](../07-validation/report.md) · [수용 기준 대조](../07-validation/coverage.csv)
