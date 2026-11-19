# 발견·채집 기록 작성 최종 검수

2026-11-20. 디자인 시스템 승인 `177a8516-82fe-4689-a7c0-961bf42cd782`에 맞춰 BugMapHarness Page 1에 편집 가능한 390×844 작성 화면 두 상태를 제작했다. [첫 진입 61:1295](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=61-1295) · [입력 완료 61:1552](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=61-1552) · [수용 기준 대조](coverage.csv)

## 실제 Figma 플레이어

1. [기존 메인 지도 41:81](https://www.figma.com/proto/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81&scaling=scale-down)에서 ‘발견/채집 기록하기’ 버튼 `41:443`을 눌러 첫 진입 화면 `61:1295`를 열었다. [첫 진입](prototype/02-entry-default.jpg)
2. 사진 0장 상태에서 화면을 스크롤해 위치와 발견 날짜·시간 아래의 112px 메모 전체를 보았다. ‘작성완료’는 같은 위치의 비활성 상태로 남았다. 뒤로 가기를 눌러 기존 지도 `41:81`로 복귀했다. [메모까지 스크롤](prototype/03-entry-default-scrolled.jpg) · [지도 복귀](prototype/04-map-after-entry.jpg)
3. 별도로 연 사진 3장 입력 완료 예시 `61:1552`에서도 메모까지 스크롤했고, 활성 ‘작성완료’가 같은 위치에 있었다. 뒤로 가기를 눌러 같은 지도로 복귀했다. [입력 완료](prototype/05-entry-ready.jpg) · [완료 상태 스크롤](prototype/06-entry-ready-scrolled.jpg) · [지도 복귀](prototype/07-map-after-ready.jpg)

Chrome에서 실제 조작 후 목적지 URL과 그려진 화면을 확인하고 7개 화면을 캡처했다. 메인 지도의 기록 버튼과 완료 상태의 세 사진이 보이는 상태에서 캡처했다. 스크롤 전후 본문에서 첫 진입 54,416px과 입력 완료 78,116px이 바뀌었다. 두 ‘작성완료’ 영역의 11,700px에서 RGB 차이는 각각 0개였다. 네이티브 스크롤 영역은 620px, 첫 진입·완료 본문은 각각 696px·794px이다. [플레이어 결과와 해시](prototype-runtime.json) · [픽셀 대조](player-pixels.json) · [실제 연결과 레이어 좌표](../06-figma/prototype-readback.json)

## 화면과 자동 검사

- 실제 두 PNG에서 0/3장과 3/3장, 촬영·첨부, 사진 삭제, 곤충 이름·유형, 필수 발견 위치, 별도 날짜·시간을 확인했다. 위치는 지도에서 확인·변경하거나 현재 위치를 쓰는 한 항목이다. 입력 완료에는 승인 사진 세 장을 각각 편집 가능한 이미지 채우기로 사용했다. [첫 진입 내보내기](../06-figma/captures/record-entry-default.png) · [입력 완료 내보내기](../06-figma/captures/record-entry-ready.png) · [사진 출처](../05-design-system/asset-sources.md)
- 네이티브 검사에서 노드 303개와 등록 사진 3개를 대조해 이슈가 0개였다. 두 전체 폼의 조작 영역 13개·16개는 각각 44×44px 이상이다. 벡터 두 개의 사용되지 않는 채우기를 제거한 뒤 다시 내보냈고 화면·조작 연결은 바이트 및 속성 비교에서 일치했다. [Figma 검사](figma-lint.json) · [벡터 보정](../06-figma/vector-repair.json) · [재내보내기](../06-figma/fresh-export-check.json)
- 기존 페이지 루트 11개와 기존 프레임 PNG 5장은 추가한 기록 버튼 연결을 제외하고 제작 전후 일치했다. Mapbox 공식 로고가 담긴 메인 지도 PNG는 기존 지도 인계 캡처와도 일치한다. [기존 화면 보존 대조](../06-figma/preservation.json)
- 대응 HTML 두 상태의 Chromium 390×844 검사에서 이슈 0개였다. 승인 PNG와의 비교에서 이미지 채널 허용차를 넘는 픽셀은 두 상태 모두 0개였다. 웹 입력에서 실제 줄바꿈으로 입력한 두 줄 메모를 다시 열어 확인했다. 승인 캡처의 글자 대비는 최저 5.52:1이다. [웹 검사](web-lint.json) · [대응 및 브라우저 조작 기록](../06-figma/capture-crosscheck.json) · [대비 측정](../05-design-system/render-report.json)
- Figma 데스크톱의 사용 가능 서체에 Pretendard가 없어 기존 지도와 같은 Noto Sans KR Medium/Bold를 사용했다. 글자 폭과 무게, 첫 진입 메모의 스크롤 경계에 시각 차이가 있다. 대응 HTML에는 승인 시안의 Pretendard를 사용했다. [제작 기록](../06-figma/change-log.md) · [차이 및 남은 검증](issues.csv)

## 제품 구현에서 확인할 내용

사진 촬영·첨부와 접근 권한, 사진을 삭제한 뒤 다시 추가하는 흐름, GPS·수동 지도 선택기, 날짜·시간 선택기, 누락된 필수 항목 안내, 미저장 이탈 확인, 실제 저장·재시도와 지도 반영은 제품에서 확인한다. 새 기록의 대략적인 공개 좌표 생성 및 정밀도, 공개 사진의 위치 메타데이터 제거, 상세의 메모 보존과 실기기 접근성도 후속 검증 범위다. [제품 흐름](../03-structure/flows.mmd) · [상태표](../03-structure/states.csv) · [기술 명세](../../../docs/TDD.md)

사람의 디자인 검수 평가와 승인은 하네스에 별도로 기록한다. [재개 지점](../control/flow.md)
