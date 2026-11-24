# 기록 묶음 선택 상태의 재개 지점

## 2026-11-24 확대 와이어프레임 재승인 대기

- 사용자의 크기 피드백에 따라 390×844에서 하단 패널을 448px로 확대했다. 패널은 화면의 53.1%이며 위쪽 두 모서리는 32px다. 세 행은 104px 높이, 사진은 80×80px다.
- 선택한 `기록 3`의 지도 중심 위치를 유지한다. 출처와 다른 묶음 `기록 7`이 지도에 남는다. GPS와 기록 작성은 선택 중 접고 닫을 때 같은 카메라에서 복원한다. 확대 시안에 사용할 제목 24px, 곤충 이름 18px, 발견 날짜 14px는 [검수 기록](../04-wireframes/review.md)에 명시했다.
- [확대 와이어프레임 PNG](../04-wireframes/captures/main-map/cluster-selected.png) · [독립 비평](../04-wireframes/critique.md) · [이전 패널 보관본](history/2026-11-24-compact-cluster-panel/README.md)
- 확대 와이어프레임 JSON SHA-256 `de543443bca21b07e5ae84a645ac2176b25ad160e09eb643b7fcaa958eeecddc`, PNG `5a665be4e91ec247073d1c9196b51c93e1d7fa593602729ef03bb066185341e7`. PRD, 리서치, 구조를 통과했고 이전 와이어프레임 승인은 배치 변경으로 재승인이 필요하다.
- 확대 와이어프레임 승인 후 이 배치로 디자인 시스템 시안을 다시 제작한다. Figma 제작과 클릭 검증은 디자인 시스템 승인 이후다.

## 사람 승인

```sh
cd /Users/mac/Documents/BugMap
node tools/design-harness/bin/design-harness approve wireframes --project bugmap-record-cluster-harness --by "본인 이름"
```

## 재개 확인

```sh
cd /Users/mac/Documents/BugMap
node tools/design-harness/bin/design-harness check --project bugmap-record-cluster-harness --json
```

와이어프레임이 `passed`이고 다음 단계가 `design-system`인지 확인한다.
