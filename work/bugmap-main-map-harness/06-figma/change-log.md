# BugMapHarness 메인 지도 Figma 제작 기록

2026-11-19. 디자인 시스템 승인 `b95f6ebe-352d-4004-9602-93da1a83250f`와 승인 입력 해시를 확인했다. 와이어프레임과 [승인 다크 시안](../05-design-system/captures/390x844-default.png)을 바탕으로 [07 · 메인 / 발견 지도](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81) 한 장을 BugMapHarness Page 1의 기존 로그인 프레임 오른쪽 96px에 추가했다. 원격 문서명은 `BugMapHarness`이며, 승인 설정은 당시 이름 `BugMapHaness`와 같은 파일 링크를 보존한다. 데스크톱 연결은 자체 파일 키를 반환하지 않았다. 현재 문서명, 페이지 ID와 이름, 기존 프레임 두 개의 ID·이름·배치를 확인했다.

- 기존 Cursor MCP Plugin과 로컬 릴레이를 사용했다. 메인 지도 제작·복구 명령을 임시로 연결하고 기존 플러그인의 두 소스 파일을 백업 바이트로 복원했다.
- 다크 지도와 Lucide 아이콘, 공식 Mapbox 로고는 벡터 레이어다. 검색·탭·버튼과 기록 건수는 편집 가능한 텍스트다. 하단 패널과 조작부에 오토레이아웃을 사용했다. 총 건수 마커는 한 컴포넌트의 인스턴스 세 개다. 33개 레이어에 Figma 변수가 연결돼 있다. 실제 Figma에서 Pretendard를 사용할 수 없어 한국어 대체 글꼴 Noto Sans KR Medium·Bold를 적용했다.
- 최초 SVG 가져오기에서 Figma의 자동 레이아웃과 크기 재설정이 벡터를 세로로 압축했다. 동일 프레임 안에서 지도·로고·아이콘·상태 표시 벡터 11개를 기본 좌표를 보존하는 그룹으로 보정했다. 현재 위치 원은 승인 불투명도 43/255를 직접 적용했다. [최초 캡처](before-vector-repair/captures/main-map-default.png) · [보정 기록](vector-repair.json) · [최종 Figma 캡처](captures/main-map-default.png)
- 원격에서 390×844 PNG와 전체 원시 트리를 읽었다. 기존 `7:2` 및 `19:2`의 제작 전후 트리·PNG 해시를 대조했고, 보정 중에도 두 기존 프레임이 일치했다. [제작 전후](before-vector-repair/preservation.json) · [보정 전후](preservation.json) · [노드 매핑](node-map.json)

## 검사 범위

[대응 HTML](web/README.md)은 390×844 Chromium에서 하네스 웹 검사 이슈가 0건이었고 승인 캡처 대비 임계값을 넘는 변경 픽셀이 0개였다. 실제 Figma 캡처에는 원본 지도, 12개 조작 영역, 네 개 탭과 단독 선택 상태, 기본 지도에서 반경 경계가 없는 상태를 확인했다. 검색·드래그·GPS·출처 버튼과 지도 동작은 구현 검증 대상이다.

Figma 자동 검사는 조회된 노드 410개 중 공식 Mapbox 벡터의 검정·흰색에 색상 이슈 10건을 반환했다. 승인된 공식 SVG의 원본 색상을 적용했다. 현 검사기는 디자인 토큰과 등록 PNG를 검사하며 공식 SVG의 고정 색상에 대한 자산 예외가 없다. [Figma 검사 결과](../07-validation/figma-lint.json)

## 2026-11-20 공식 SVG 검사 보완

Mapbox 원본 SVG와 Figma 프레임을 변경하지 않았다. 로고 컨테이너 `41:819`를 승인 자산에 연결하고, 원본 해시와 벡터 경로·구조 및 흑백 페인트 12개를 검증했다. 전체 410개 노드 검사 이슈는 0건이다. [Figma 검사](../07-validation/figma-lint.json)
