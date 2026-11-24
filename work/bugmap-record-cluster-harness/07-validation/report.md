# 기록 묶음 선택 검증

2026-11-24 · BugMapHarness Page 1 · 390×844

## 실제 Figma 플레이어

[원본 지도](https://www.figma.com/proto/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81&scaling=scale-down)에서 기록 3과 기록 7을 각각 눌러 두 새 화면에 진입했다. 두 화면을 닫았을 때 같은 지도 카메라와 메뉴바가 돌아왔으며 초기 지도와 복귀 이미지의 RGB 차이는 각각 0픽셀이다. [3건 진입](captures/player/02-selected-three.png) · [3건에서 복귀](captures/player/03-back-from-three.png) · [7건에서 복귀](captures/player/09-back-from-seven.png)

7건에서는 104px 높이의 첫 세 행과 네 번째 행 상단 26px가 보인다. 목록을 스크롤해 네 번째와 일곱 번째 행 전체를 확인했다. 처음과 끝을 비교했을 때 목록 안의 50,727픽셀이 바뀌었고 지도, 제목·닫기, 아래 34px 안전 영역의 RGB 차이는 각각 0픽셀이다. [시작](captures/player/04-selected-seven-start.png) · [네 번째 행 전체](captures/player/05-selected-seven-middle.png) · [끝](captures/player/06-selected-seven-end.png)

첫 실행에서 목록을 내린 상태가 7건 화면에 재진입할 때 남는 것을 발견했다. Figma 편집기에서 원본 7건 마커와 3건 화면의 7건 전환 마커에 스크롤 초기화를 적용했다. 7건 → 3건 → 7건 전환과 7건 → 지도 → 7건 재진입을 다시 조작해 초기 목록과의 RGB 차이 0픽셀을 확인했다. [묶음 전환 후](captures/player/08-switch-to-seven-reset.png) · [지도에서 재진입](captures/player/10-reopen-seven-reset.png) · [실제 플레이어 URL과 픽셀 비교](player-runtime.json)

## 정확히 4건인 HTML

같은 패널 높이와 같은 104px 행 높이로 네 건을 넣었다. 시작에는 세 행과 네 번째 카드의 위쪽 26px, 사진의 위쪽 14px만 보인다. 실제 휠 입력으로 78px를 스크롤해 네 번째 카드를 안전 영역 위 y=706–810에 표시하고 카드를 눌러 `record-overflow-demo-04`가 화면에 전달되는 것을 확인했다. 7건 HTML에서도 맨 끝에서 `record-overflow-demo-07`을 받았다. [4건 시작](captures/web-scroll/4-start.png) · [4건 끝](captures/web-scroll/4-end.png) · [브라우저 조작 결과](web-scroll.json)

## 작은 화면과 큰 글자

320×700 Chromium 검증 화면에 승인된 패널·행·사진·글꼴과 같은 토큰을 적용하고 제목·행을 가변 높이로 구성했다. 글자 100%와 200% 모두에서 긴 예시 이름 `사진 속 칠성무당벌레 관찰`이 두 줄과 세 줄로 표시됐으며 각각 104px와 약 188px 높이의 첫 행 전체를 읽을 수 있었다. 두 마커, Mapbox 로고, 출처와 닫기 영역이 보였고 이름·사진·날짜는 겹치지 않았다. 모든 일곱 행을 한 행씩 끝까지 확인했고, 실제 휠 입력으로 끝까지 내려 마지막 행을 눌러 두 배율에서 `record-overflow-demo-07`을 받았다. [100% 시작](captures/100-start.png) · [100% 끝](captures/100-end.png) · [200% 시작](captures/200-start.png) · [200% 끝](captures/200-end.png) · [검사 데이터](adaptive-layout.json) · [재현 코드](check-adaptive-layout.mjs)

## 구조 검사와 앱 검증 범위

- Figma에서 822개 네이티브 노드를 검사해 이슈 0건을 확인했다. 공식 Mapbox 로고 2개, 등록 사진 노드 10개 및 반복 행 컴포넌트에 대응한다. Figma에서는 제공되는 Noto Sans KR Medium/Bold, 대응 HTML에서는 승인 시안의 Pretendard를 사용했다. [Figma 검사](figma-lint.json) · [제작 기록](../06-figma/change-log.md)
- 3건 및 7건 대응 HTML 검사 결과 이슈 0건이며 승인 캡처와 비교해 허용 오차를 넘는 픽셀은 0개였다. [웹 검사](web-lint.json)
- 제품에서 SDK 출처 열기, 실제 기록 상세 연결, 실기기의 시스템 글자 확대와 보조기술 포커스를 확인한다. 기존 지도에는 출처 버튼의 프로토타입 연결이 없었으며 두 디자인에서 출처 로고와 44×44px 조작 영역을 확인했다. [수용 기준 대조](coverage.csv) · [이슈와 앱 확인 항목](issues.csv)
