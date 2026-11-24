# 기록 묶음 선택 PRD 비평

1차에서 출처 버튼 조작과 같은 공개 좌표의 기록별 상세 진입 조건을 보완했다. 2차 비평가는 보완한 문서를 승인 검토 가능 상태로 판정했다. [현재 단계 PRD](PRD.md) · [수용 기준](requirements.csv) · [재개 지점](../control/flow.md)

## 1차 독립 비평 원문

### 판정 — `needs_revision`

기록 `3` 선택 상태를 390×844 Figma 프레임 한 장으로 설계하는 범위는 사용자 요청과 일치합니다. 승인 전에 제품 요구사항 두 가지를 수용 기준에 연결해야 합니다.

- **중요 · MAP-09 출처 열기.** `CLUSTER-05`는 로고와 출처 버튼의 노출만 검사합니다. 화면 명세는 패널 위에서 출처 버튼을 눌러 정보를 열 수 있어야 한다고 요구하지만 Figma 편집 정책의 연결 범위에는 이 동작이 없습니다. 새 화면 한 장 범위에서 기존 출처 동작을 재사용할 수 있는지 확인하고, PRD·CSV·편집 정책에 합의된 검증 방법을 명시하세요. 실제 열기를 시연할 수 없는 경우에는 설계 명세의 확인 범위와 실제 동작의 미검증을 기록하세요. [수용 기준](/private/tmp/bugmap-doc.bwE3M0Wr/cluster-stage/work/bugmap-record-cluster-harness/01-prd/requirements.csv:6) · [화면 명세](/Users/mac/Documents/BugMap/docs/screens/main-map.md:23)
- **중요 · MAP-06 같은 공개 좌표의 기록.** `CLUSTER-02/03`에는 공개 좌표가 같은 기록도 각각 열 수 있다는 조건이 빠져 있습니다. `CLUSTER-03`에 MAP-06과 묶음 화면 명세를 연결하고, 같은 좌표에 있는 두 기록도 서로 다른 행과 기록 ID를 통해 각자의 전체 사진과 메모로 이어진다는 점을 명세에서 확인하도록 하세요. [제품 PRD](/Users/mac/Documents/BugMap/docs/PRD.md:79) · [기술 기준](/Users/mac/Documents/BugMap/docs/TDD.md:324)
- **경미 · 판정 문구.** `CLUSTER-01/04`에 선택 시 하단 메뉴바가 패널로 대체되고 닫으면 기존 지도 위치에서 메뉴바가 복원되는지를 명시하세요. `CLUSTER-02`에는 단계 PRD의 `이름 모름` 조건을 연결하세요. [수용 기준](/private/tmp/bugmap-doc.bwE3M0Wr/cluster-stage/work/bugmap-record-cluster-harness/01-prd/requirements.csv:2) · [단계 PRD](/private/tmp/bugmap-doc.bwE3M0Wr/cluster-stage/work/bugmap-record-cluster-harness/01-prd/PRD.md:8)

### 검토 버전과 미검증

임시 프로젝트의 README, `control` 문서 3개, 단계 PRD와 CSV를 대조했습니다. SHA-256 앞 12자리는 순서대로 `0424a31909da`, `5422ee12f027`(project), `7ce3672b297b`(decisions), `6df201202c6a`(figma), `a608782320ad`, `90b2151d6880`입니다. 제품 기준 문서의 해시는 프로젝트 기록과 일치했습니다. 기본 지도와 Kyro 참고 캡처 두 장을 직접 열었고 제공된 SHA-256과 일치했습니다. 두 캡처는 지도와 선택 위치를 패널과 함께 보여주는 구성의 근거입니다.

읽기 전용 CLI 재실행에서 `prd / awaiting_approval / canApprove=true`와 사람 승인 필요 항목을 확인했습니다. 실제 Figma 노드, 프로토타입 조작과 출처 열기는 미검증입니다.

## 2차 독립 비평 원문

**1단계 PRD · `ready`**  
승인 전에 고쳐야 할 범위나 수용 조건의 누락은 발견하지 않았습니다. 파일 수정은 없습니다.

- **범위와 수용 조건** — 390×844 선택 상태 한 장에서 `기록 3` 진입, 마커 강조, 건수와 일치하는 세 행, 같은 공개 좌표의 기록별 상세 연결, 닫은 뒤 기존 지도 위치 복귀를 확인할 수 있습니다. 다른 묶음으로 바꾸는 동작과 기록 상세 연결은 명세 검증으로 정의돼 있습니다. MAP-05의 개별 마커 카드는 별도 상태입니다.
- **출처 조작** — MAP-09의 공식 로고와 출처 버튼 가시성, 44×44 터치 영역이 수용 조건에 있습니다. 기존 Figma 출처 동작이 없을 때 실제 출처 열기는 앱 검증 항목으로 남습니다.
- **시각 근거** — 두 PNG를 직접 열었고 전체 SHA-256이 전달값과 일치했습니다. 기본 지도(`3c391df201a8…`)에서 `기록 3`과 패널 위 Mapbox 조작부를, Kyro(`5dbbbb9749e6…`)에서 지도·선택 위치·닫기 버튼이 있는 하단 패널의 동시 노출을 확인했습니다.
- **입력 버전** — SHA-256 앞 12자리 기준 README `0424a31909da`, project `5422ee12f027`, decisions `166b31b8ce88`, figma `61a8bb594d5d`, PRD `ae9ec63ca386`, requirements `395db1c7c53a`입니다. 정식 기준 문서의 전체 해시는 `control/project.json`과 일치했습니다.
- **CLI 확인** — `check --json`은 종료 `1`, `currentStage=prd`, `status=awaiting_approval`, `canApprove=true`였고 PRD 단계 이슈는 사람 승인 대기 한 건입니다.
- **미검증** — 라이브 Figma 연결·노드·프로토타입 조작과 앱 동작은 검토 범위 밖입니다. 임시 검토본에서 README의 `control/flow.md` 링크는 아직 열리지 않습니다. 정식 배치 때 링크를 확인하면 됩니다.
