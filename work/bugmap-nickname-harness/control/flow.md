# 닉네임 설정 하네스 진행 기록

- 2026-11-24 · 1단계 요구사항 초안과 수용 기준 작성. `control/project.json`에 기준 문서·기존 캡처·Kyro 첨부 해시를 기록했다. Cursor Talk to Figma에서 BugMapHarness Page 1 `0:1`, 로그인 `19:2`, 메인 지도 `41:81`을 읽어 Figma 대상을 대조했다.
- 검토 대상은 [PRD](../01-prd/PRD.md), [수용 기준](../01-prd/requirements.csv) 및 [결정 기록](decisions.md)이다.
- PRD 비평 후 미저장 재진입, 소셜 이름 구분, 예시 길이 경계, 한글 조합 완료 시점, 독립 Figma 프레임의 검수 범위를 보강했다.
- 1단계 사용자 기록 `node tools/design-harness/bin/design-harness approve prd --project bugmap-nickname-harness --by "본인 이름"`.
- 재개 시 `node tools/design-harness/bin/design-harness check --project bugmap-nickname-harness --json`으로 PRD 승인 및 입력 버전을 확인한 뒤 리서치 단계로 진행한다.
- 독립 재검토에서 중요 이슈가 해소됐다. [비평 기록](../01-prd/critique.md). 현재 PRD 사람 승인 대기다. Figma 변경은 시작하지 않았다.

## 리서치·구조·와이어프레임

- PRD 사람 승인 `06e2ec90-9fd2-4117-ad55-f8136916124e` 확인. [출처](../02-research/sources.md)와 [리서치 독립 비평](../02-research/critique.md)을 남겼다. Kyro와 기존 로그인·지도 및 Apple HIG의 실제 캡처를 확인했다.
- [상태표](../03-structure/states.csv), [흐름](../03-structure/flows.mmd)과 [와이어프레임 검수](../04-wireframes/review.md)를 준비했다. 390 × 844 세 후보와 360 × 800 검수 변형 세 장을 CLI로 생성했고 캡처를 직접 열었다. 에러 노출 후 확정 입력의 유효성에 따라 즉시 갱신·해제하도록 흐름을 보완했다.
- 다음 사람 승인 명령 `node tools/design-harness/bin/design-harness approve wireframes --project bugmap-nickname-harness --by "본인 이름"`.
- 재개 시 `node tools/design-harness/bin/design-harness check --project bugmap-nickname-harness --json`으로 단계와 승인 해시를 확인한다. 와이어프레임이 유효하게 승인된 뒤 디자인 시스템 단계로 진행한다.
- 수정 후 [독립 비평](../04-wireframes/critique.md) 판정 ready. CLI에서 리서치·구조 통과와 와이어프레임 사람 승인 대기를 확인했다.

## 디자인 시스템

- 와이어프레임 승인 `48dbecdf-065f-429c-9be4-5feea9d0f357`의 유효성을 확인했다. [시각 시안 및 검수](../05-design-system/review.md)를 제작하고 두 크기의 캡처 여섯 장과 입력 대비·크기를 검증했다.
- [독립 검수](../05-design-system/critique.md) 판정 ready. 현재 디자인 시스템 사람 승인 대기다. Figma 노드는 아직 제작하지 않았다.
- 다음 승인 명령 `node tools/design-harness/bin/design-harness approve design-system --project bugmap-nickname-harness --by "본인 이름"`.
- 재개 시 `node tools/design-harness/bin/design-harness check --project bugmap-nickname-harness --json`을 실행해 승인된 버전을 확인한다. 유효한 승인 후 커서 브리지에서 BugMapHarness Page 1 및 목적지 41:81을 다시 조회한다.

## Figma 제작 재개

- 디자인 시스템 승인 `7e46e4af-78bf-439d-acb6-9d1629fe5b72`가 유효하다. Cursor MCP Plugin으로 BugMapHarness Page 1과 기존 로그인 `19:2`, 발견 지도 `41:81`을 대조했다.
- 임시 개발 도구는 `/private/tmp/bugmap-nick-native`에 있다. 재연결 채널에 원본 BugMap 탭 플러그인도 응답해 페이지 가드가 중단했다. 대상 거절 응답을 건너뛰는 방식은 자동 승인 검토가 차단했다. Figma 변경은 시작하지 않았다.
- 원본 BugMap 탭 플러그인만 닫고 BugMapHarness 쪽을 유지한 뒤 필터 없는 대상 점검을 재시도한다. 다시 실행이 필요하면 임시 명령 설치 상태와 로컬 원본 복원 기록을 먼저 확인한다.
- 승인 범위는 Figma 화면 3개이며 작은 화면 변형은 검수용이다. 하네스 검사에서 기존 프로젝트 설정의 화면·상태 범위를 사용하도록 수정했다. Figma 검사 회귀 테스트 15개 통과. 승인 HTML의 두 크기 × 세 상태 비교도 임시 경로에서 이슈 0건을 확인했다. 정식 06·07의 Figma 제작 및 검증 증거는 대기 중이다.

## Figma 제작과 최종 검증

- 2026-11-25 · 정확한 문서·페이지·앵커를 확인한 창만 전용 채널에 접속하도록 한 뒤 Cursor MCP Plugin으로 신규 상태 3개를 제작했다. [Figma 노드 맵](../06-figma/node-map.json) · [플러그인 복원](../06-figma/cursor-source-restore.json)
- [최종 검증](../07-validation/report.md) 및 [독립 비평](../07-validation/critique.md). 실제 플레이어에서 저장 가능 화면을 눌러 기존 발견 지도 41:81로 이동했다. Figma 358개 노드와 웹 검수 여섯 건에서 이슈 0건이다.
- 다음 사람 기록은 `node tools/design-harness/bin/design-harness review validation --project bugmap-nickname-harness --by "본인 이름" --score 4 --notes "본인 검토 내용"`이다. 4는 통과 기준의 예시 점수다. 실제 검토에 맞는 점수를 사용한다. 이후 `node tools/design-harness/bin/design-harness approve validation --project bugmap-nickname-harness --by "본인 이름"`를 실행한다.
- 재개 시 `node tools/design-harness/bin/design-harness check --project bugmap-nickname-harness --json`으로 사람 검토·승인을 대조한다.

## 개발 인계

- 최종 검수 승인 `a97ad5d9-478c-4ce4-9414-a81dd2fc1db5`를 확인해 [개발 인계](../08-handoff/HANDOFF.md)를 생성했다. [후속 검증과 담당 역할](../08-handoff/open-items.md) · [해시 매니페스트](../08-handoff/manifest.json)
- 다음 사람 수락 명령은 `node tools/design-harness/bin/design-harness approve handoff --project bugmap-nickname-harness --by "본인 이름"`이다. 재개 시 `node tools/design-harness/bin/design-harness check --project bugmap-nickname-harness --json`으로 완료 상태와 실제 승인 기록을 대조한다.
- [독립 인계 재검토](../08-handoff/critique.md) 판정 ready. 하네스 01~07 통과, 08 사람 수락 대기.
- 2026-11-25 · 사람의 인계 수락 `8fe7eca2-672e-4bab-8036-04bdfeba3ac9`를 확인했다. CLI에서 01~08 모두 통과했고 `complete: true`다. [개발 인계](../08-handoff/HANDOFF.md) · [검증 범위](../07-validation/report.md)
