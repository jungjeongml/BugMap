# 기록 묶음 선택 상태의 재개 지점

## 2026-11-24 디자인 시스템 승인 대기

- PRD `1edd277b-9ad7-4aec-b138-ffc18a9a654a`, 와이어프레임 `ebec90a2-123f-46c4-88c1-b0979cdeccbe` 승인과 리서치·구조 통과를 정식 저장소에서 확인했다.
- 390×844 시안에 기존 서울숲 지도와 마커 중심, 연두색 선택 윤곽, 상단 좌우 32px 패널을 적용했다. 사진·이름·발견일 세 행, 출처와 GPS·기록 작성 버튼을 함께 배치했다.
- [대표 PNG](../05-design-system/captures/390x844-cluster-selected.png) · [디자인 명세](../05-design-system/DESIGN.md) · [시각 검수](../05-design-system/review.md) · [독립 비평](../05-design-system/critique.md) · [사진과 자산 출처](../05-design-system/asset-sources.md)
- PNG SHA-256은 `2d9ea572d7227c2725004ba2f5c62d1966ba4f13736d29704a1aed02a59ed970`, SVG는 `5c6cfc59ef31cb349bcf6737b870aba28c2c57ba15757d2af1b90a7aa0727f72`다. 로컬 캡처와 토큰, 10개 조작 영역을 검수했다.
- 승인할 항목은 이 화면의 지도·패널·목록 시각 방향과 재사용 자산이다. 승인 후 BugMapHarness Page 1에서 Cursor 브리지로 기존 대상과 연결을 다시 확인한다. Figma 노드와 프로토타입 동작, 네이티브 큰 글자는 후속 검증 항목이다.

## 사람 승인

```sh
cd /Users/mac/Documents/BugMap
node tools/design-harness/bin/design-harness approve design-system --project bugmap-record-cluster-harness --by "본인 이름"
```

## 재개 확인

```sh
cd /Users/mac/Documents/BugMap
node tools/design-harness/bin/design-harness check --project bugmap-record-cluster-harness --json
```

디자인 시스템이 `passed`이고 다음 단계가 `figma`인지 확인한 뒤 Figma 작업을 시작한다.
