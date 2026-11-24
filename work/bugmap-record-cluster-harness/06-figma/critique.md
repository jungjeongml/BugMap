# 기록 묶음 선택 Figma 독립 검토

## 첫 검토

**판정 `ready` — 직접 확인한 정적 화면과 네이티브 노드 범위.** 조정자가 Figma 플레이어에서 별도로 확인한 7건 → 3건 → 7건 전환 후 스크롤 위치 유지 문제는 `CLUSTER-04`를 충족하려면 수정이 필요하다. 이 검토에서는 플레이어를 직접 조작하지 않았다.

### 근거

- 승인 `80fd3cc0-9f6c-40a7-a524-7d9cd5a076c3`의 PRD, 수용 기준, 04 와이어프레임, 05 디자인 시스템을 대조했다. 양쪽 와이어프레임과 디자인 캡처, 네이티브 PNG 두 장을 직접 열었다. `node-map.json`과 `nodes.json`의 SHA-256은 각각 `d39c917edb7d69c8670a0b943f6a332f8632b0ac93774def3af2dab5e2f32e59`와 `3ffaa6976ebde9ec0bdb3331459539402ebb2438ad7a19b7ca775ecae144abcb`다. 네이티브 PNG 해시는 3건 `66ac0120c3b6007282c7cb1453d1e6b2ad4522c40b3ce9b75ff5b5e4d091a6dd`, 7건 `fadf33586d577a7265188a1052589d91759bce842a288d05fa85c86e5d3987c2`다. 프리플라이트는 822개 노드에서 이슈 0건을 기록했다.
- 390×844의 두 화면에서 선택 마커, 공식 Mapbox 로고, 출처 버튼이 패널 위에 가려짐 없이 보인다. 패널 높이는 448px와 468px이며, `#131E18` 표면과 `#3B4D42` 테두리, 상단 32px·하단 0px 모서리를 확인했다. 출처 버튼은 44×44px, 닫기는 48×48px, 행은 358×104px다. 행의 16px 모서리와 썸네일의 80×80px·12px 모서리도 승인 기준과 일치한다.
- 3건 화면은 세 행 전체를 표시한다. 7건 화면은 서로 다른 7개 행 인스턴스에 편집 가능한 사진·이름·날짜를 담는다. `162:1941`은 높이 362px에 세로 오버플로와 클리핑이 설정된 네이티브 프레임이다. 제목과 닫기는 그 바깥에 있다. 시작 캡처에서 첫 세 행 전체, 네 번째 행 상단 26px와 썸네일 상단 14px가 보이고 네 번째 이름과 날짜는 가려져 있다.
- 네이티브 연결 조회에서 `41:394 → 162:1204`, `41:390 → 162:1597`, 양쪽 닫기 `→ 41:81`, 선택 상태 간 양방향 전환을 확인했다. 추가한 마커 연결 두 개를 제외한 기존 루트 16개의 트리 해시와 메인 지도 PNG 해시, 기존 시작점이 전후 일치한다.
- 대응 HTML 두 화면의 기본 캡처와 정확히 4건인 시작·끝 캡처, 7건 끝 캡처를 직접 열었다. 기존 브라우저 실행 기록에서 4건과 7건 모두 네 번째 행이 26px로 시작했고, 제목과 닫기 위치가 유지됐다. 끝에서 마지막 행은 `y=706–810`에 온전히 보였고 클릭 결과는 각각 `record-overflow-demo-04`, `record-overflow-demo-07`이었다.

### 경미한 발견과 미검증

- 제목 텍스트 레이어는 승인 슬롯보다 7px 아래에서 시작하고 높이가 6px 작다. 캡처에서 줄바꿈이나 충돌은 없고, 승인된 Noto Sans KR 대체 글꼴과 24px·32px 행간이 적용됐다. 좌표를 넘길 때 승인 슬롯과 네이티브 텍스트 경계를 구분하면 된다.
- 원본 출처 버튼 반응은 비어 있다. 두 선택 상태에서 SDK 출처 버튼을 눌러 정보가 열리는지 확인하는 제품 검증 항목을 변경 기록에 명시할 것을 권한다.
- 수정 뒤 Figma 플레이어에서 7건 목록을 끝까지 스크롤하고 3건을 거쳐 돌아왔을 때 목록이 맨 위에서 시작하는지 재검증해야 한다. 작은 화면·큰 글자·긴 이름과 기록 상세 진입은 제품 검증 범위다. 파일이나 승인 기록은 수정하지 않았다.

## 초기화 보정 후 독립 검토

Phase 6 ready, with no blocking visual or behavior fix. Final changelog identifies earlier failure as history and explains current reset. Directly checked both native PNGs plus runtime middle/end, switch-back and reopen; 7th row is fully above safe area and reset shots visibly return to initial row. First editor screenshot shows blue checkbox, second grey; your explicit capture note accurately discloses this evidence limitation, with actual player behavior established separately. Final raw SHA and node map/static PNG hashes confirmed.

검토한 최종 네이티브 노드 SHA-256은 `78af3faef862c1701f209ba0779bf8f9b40ac89fd4ebf9537ac08c286b94dbaa`, 노드 매핑은 `d39c917edb7d69c8670a0b943f6a332f8632b0ac93774def3af2dab5e2f32e59`다. 네이티브 캡처 두 장은 첫 검토와 같은 해시다. [Figma 편집기·플레이어 확인](scroll-reset-verification.json)
