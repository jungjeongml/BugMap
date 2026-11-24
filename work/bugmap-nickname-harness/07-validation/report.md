# 닉네임 설정 Figma 검증

2026-11-25 · BugMapHarness Page 1 · 편집 가능한 390 × 844 프레임 세 개

## 세 화면과 지도 이동

- [첫 입력](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=182-551)에는 빈 입력란, 공개 기록의 작성자 이름 안내, 비활성 ‘시작하기’가 보인다. [네이티브 캡처](../06-figma/captures/nickname-setup--initial.png)
- [저장 가능](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=182-671)에는 ‘숲길관찰자’와 활성 ‘시작하기’가 보인다. 플레이어에서 실제 버튼을 눌러 기존 발견 지도 `41:81`로 이동했다. [클릭 전](captures/player/01-ready.png) · [클릭 후](captures/player/02-discovery-map.png) · [플레이어 기록](player-runtime.json)
- [입력 오류](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=182-790)에는 입력한 ‘숲’과 ‘닉네임을 2자 이상 입력해 주세요’가 함께 보인다. 첫 입력과 오류 상태의 비활성 버튼에는 이동 연결이 없다. [네이티브 캡처](../06-figma/captures/nickname-setup--invalid.png) · [연결 조회](../06-figma/prototype-readback.json)

## 검사 및 보존

- Figma 네이티브 358개 노드 검사 이슈는 0건이다. 세 캡처에서 입력 위치, 글자 읽기 순서, 잘림·겹침과 상태 표시를 비교했다. 공통 구성 요소는 로컬 인스턴스와 색 변수에 연결했다. 기존 루트 19개, 로그인·지도 PNG 해시와 기존 시작점이 제작 전후에 일치했다. [Figma 검사](figma-lint.json) · [보존 기록](../06-figma/preservation.json)
- 390 × 844와 360 × 800의 정적 HTML 6건에서 이슈와 승인 HTML 캡처 대비 변경 픽셀이 모두 0건이었다. 두 크기에서 입력란 높이는 52 px, 버튼 높이는 48 px이며 시연 키보드 위 버튼 여유는 20 px다. 360 × 800은 검수 크기다. [웹 검사](web-lint.json) · [치수 기록](../05-design-system/render-report.json)
- Figma에서 Pretendard Medium/Bold를 사용할 수 없어 기존 파일과 같은 Noto Sans KR Medium/Bold를 적용했다. 웹 비교본은 승인 Pretendard를 사용한다. 네이티브 캡처에서는 글자 폭과 획이 달라졌으며 문구에 잘림과 겹침은 보이지 않았다. [제작 기록](../06-figma/change-log.md)

실제 인증의 신규·기존 계정 분기, 기기 키보드, 한글 조합, 접근성 포커스와 오류 낭독, 닉네임의 서버 저장·재시도는 앱 검증 범위다. Figma 플레이어는 저장 성공 이후의 화면 전환을 시연했다. [수용 기준 대조](coverage.csv) · [제품 검증 항목](issues.csv)
