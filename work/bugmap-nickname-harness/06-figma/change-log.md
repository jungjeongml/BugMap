# Figma 닉네임 설정 제작 기록

## 승인 및 대상

2026-11-25에 디자인 시스템 승인 `7e46e4af-78bf-439d-acb6-9d1629fe5b72`와 승인 입력 23개의 해시를 검사했다. 승인 계획 SHA-256은 `ac5f3bdf744f3d96b086e555d32dd5ad9e57250a8e344c4417540ba291399af1`다. Figma 데스크톱 Cursor MCP Plugin에서 문서명 BugMapHarness, Page 1 `0:1`, 기존 로그인 `19:2`와 발견 지도 `41:81`을 조회해 작업 대상을 확인했다. 개발 플러그인 원본의 파일 키 반환값은 null이어서, 링크에는 승인된 구성의 파일 키를 사용한다.

## 실제 편집과 상태

| 상태 | Figma 프레임과 네이티브 PNG | 표시 |
| --- | --- | --- |
| 첫 입력 | [182:551](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=182-551) · [캡처](captures/nickname-setup--initial.png) | 연두색 입력 포커스, 예시 힌트, 비활성 시작하기 |
| 저장 가능 | [182:671](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=182-671) · [캡처](captures/nickname-setup--ready.png) | 숲길관찰자와 활성 시작하기 |
| 입력 오류 | [182:790](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=182-790) · [캡처](captures/nickname-setup--invalid.png) | 숲, 코랄 테두리와 오류 안내, 비활성 시작하기 |

- 편집 가능한 390 × 844 프레임 3개와 공통 컴포넌트 8개를 추가했다. 입력·버튼·시스템 표시·키보드 예시에는 로컬 컴포넌트 인스턴스를 사용했다. 색은 동일한 기존 색 변수 또는 이 작업의 색 변수에 연결했다. 브랜드 워드마크, 지형선, 표식은 편집 가능한 벡터다. 작은 360 × 800 화면은 별도 Figma 프레임 대신 승인 검수 자료를 사용한다. [노드 맵](node-map.json) · [컴포넌트](components.json)
- 승인된 Figma 구성의 위치를 유지했다. 세 네이티브 PNG를 직접 열어 350 × 52 px 입력란, 350 × 48 px 버튼, 키보드 시연 영역과 버튼 사이 20 px, 상태별 텍스트와 색, 잘림과 겹침을 대조했다. 현재 Figma에 Pretendard Medium/Bold가 제공되지 않아 문서의 기존 화면에서 쓰는 Noto Sans KR Medium/Bold를 적용했다. 검증용 HTML은 승인 Pretendard를 유지한다.
- 저장 가능 프레임의 시작하기 `182:717`에서 기존 발견 지도 `41:81`로 이동하도록 ON_CLICK 프로토타입 연결을 추가했다. 첫 입력·입력 오류의 비활성 버튼은 이동 연결이 없다. 세 프레임은 각각 시작점이며 기존 시작점은 그대로다. 실제 노드의 연결을 별도 Cursor 내보내기에서 다시 읽었다. [프로토타입 읽기 대조](prototype-readback.json)

## 원본 보존 및 검증 경계

- 제작 전과 별도 내보내기에서 기존 루트 19개와 트리 지문, 기존 프로토타입 시작점, 로그인과 발견 지도 PNG의 SHA-256이 모두 일치했다. 네이티브 노드 검사 함수로 358개 노드를 읽었으며 이슈는 0건이다. [보존 대조](preservation.json) · [별도 내보내기](fresh-export-check.json) · [네이티브 검사](native-preflight.json)
- 이전 공용 작업 채널의 동시 응답으로 중단됐던 시도에는 Figma 변경을 적용하지 않았다. 이번에는 정확한 문서·페이지·앵커 확인을 통과한 플러그인 창만 전용 채널에 접속하도록 했다. 모든 응답에 기존 엄격 비교를 적용했다. 임시 수정한 Cursor의 두 파일을 복원 후 SHA-256으로 대조했으며 manifest는 원본과 일치한다. [Cursor 도구](cli/README.md) · [원본 복원](cursor-source-restore.json)
- [검증용 HTML](web/README.md)은 승인 소스와 동일하다. 키보드와 닉네임 입력값은 고정 시연 상태다. 실제 제품의 로그인·IME·저장·오류 복구나 기기 키보드는 검증하지 않았다. 이 단계에서는 네이티브 연결 설정을 재조회했다. 프로토타입 플레이어 조작 검증은 별도로 기록한다.
