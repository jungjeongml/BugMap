# 발견·채집 기록 Figma 제작

## 화면과 연결

| 승인 상태 | Figma 프레임 | 실제 내보내기 | 대응 HTML |
| --- | --- | --- | --- |
| 첫 진입 · 사진 0/3장 | [61:1295](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=61-1295) | [390×844 PNG](captures/record-entry-default.png) | [record-entry--default.html](web/record-entry--default.html) |
| 필수 입력 완료 · 사진 3/3장 | [61:1552](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=61-1552) | [390×844 PNG](captures/record-entry-ready.png) | [record-entry--ready.html](web/record-entry--ready.html) |

- BugMapHarness Page 1에 두 프레임과 컴포넌트 섹션을 추가했다. 23개 로컬 컴포넌트와 화면 인스턴스, 편집 가능한 텍스트·벡터를 사용했다. 기존 발견 지도 변수 8개를 재사용하고 새 폼 역할 7개를 바인딩했다. 완료 상태 사진 세 장만 등록된 342×270 PNG를 114×90 이미지 채우기로 사용한다. [네이티브 노드](nodes.json) · [컴포넌트](component-definitions.json) · [이미지 출처](../05-design-system/asset-sources.md)
- 두 화면의 높이는 844px이다. 상단 108px과 하단 고정 영역 110px 사이에 620px 클립 스크롤을 둔다. 전체 폼은 첫 진입 696px, 입력 완료 794px이다. 양쪽에서 스크롤 끝에 선택형 112px 메모가 온전히 보인다. 조작 노드 크기와 상태는 내보낸 파일에 기록했다. [노드 매핑](node-map.json) · [스크롤·반응 조회](prototype-readback.json)
- 메인 지도 41:81의 기존 ‘발견/채집 기록하기’ 41:443에 61:1295로 가는 클릭 연결을 하나 추가했다. 각 작성 화면의 뒤로 가기는 41:81로 연결한다. 기존 Page 1 루트 11개의 재귀 노드 속성과 프레임 5개의 PNG를 전후 비교했다. 기록 버튼의 새 연결을 제외한 모든 값이 일치했다. 메인 지도와 공식 Mapbox 로고를 포함한 지도 PNG는 직전 인계 캡처의 해시와도 일치한다. [보존 비교](preservation.json)
- Figma 플레이어에서 지도 버튼으로 작성 첫 화면을 열고 메모까지 스크롤한 뒤, 뒤로 가기로 같은 지도에 돌아왔다. 완료 화면을 따로 열어 같은 스크롤과 복귀를 확인했다. 양쪽 모두 스크롤 전후 작성완료 영역 11,700px의 픽셀이 동일했다. 이 조작의 캡처와 실제 URL은 후속 검증에 전달했다.

## 캡처와 승인 기준

- 네이티브 PNG 네 장을 내보냈다. 이 중 두 장은 620px로 클립된 초기 본문이다. 실제 전체 높이는 노드 트리와 플레이어의 스크롤로 확인했다. 편집에 이어 별도 읽기 호출로 노드, 컴포넌트, 연결, 이미지 바인딩과 PNG 해시를 대조했다. [독립 내보내기](fresh-export-check.json)
- 사진 첨부 Lucide 아이콘의 벡터 두 개에 SVG 가져오기가 남긴 기본색 채우기를 원본의 빈 채우기에 맞췄다. 네이티브 재조회에서 기존 화면, 연결, 크기와 PNG 바이트가 그대로였다. 최종 303개 노드의 읽기 전용 Figma 검사에서 문제는 0개였다. [벡터 보정](vector-repair.json) · [검사 결과](native-preflight.json)
- Figma 데스크톱의 제공 서체 목록에 Pretendard가 없어 기존 지도에서 사용한 Noto Sans KR Medium/Bold를 사용했다. 승인안과 네이티브 PNG를 눈으로 비교해 필드 순서, 아이콘, 썸네일, 문구, 스크롤 경계와 두 완료 상태를 확인했다. 첫 진입의 메모는 Figma에서 112px 입력을 실제로 잘라 보인다. 승인 HTML 기준은 보이는 52px에 아래 모서리 테두리를 표시한다. [캡처 비교](capture-crosscheck.json)
- HTML은 승인안의 Pretendard 원본과 Lucide 벡터 및 등록 사진을 로컬에서 불러온다. Chromium 1× 390×844에서 두 승인 PNG와 픽셀 차이가 0개였다. 본문을 스크롤한 뒤 메모에 실제 개행을 포함한 두 줄을 입력했다. 포커스를 옮기고 메모를 다시 열어 두 줄을 대조했다. 초기 점검의 예시가 개행 대신 역슬래시와 n을 입력하던 문제를 바로잡아 다시 실행했다. [HTML과 범위](web/README.md) · [브라우저 결과](capture-crosscheck.json)

## 제작 범위

- 파일과 페이지, 승인 ID, 입력 SHA-256, 기존 지도 노드를 대조했다. 공식 Figma 연결은 세션을 만들었으나 읽기부터 Starter Plan 한도를 반환했다. 기존 개발 Cursor 연결에서 실제 제작과 재조회, 내보내기를 했다. [입력 해시](cli/plan.json) · [도구](cli/README.md) · [제작 후 복원](cursor-source-restore.json) · [벡터 보정 후 복원](cursor-second-restore.json)
- 대표 시안은 기록 버튼과 뒤로 가기, 고정 헤더·완료 영역, 두 폼 상태를 다룬다. 사진 선택 및 촬영, GPS·위치 선택기, 날짜·시간 선택기, 저장, 권한과 오류 처리, 미저장 입력 확인은 제품 흐름 명세에 있다. [상태 명세](../03-structure/states.csv) · [요구사항](../01-prd/requirements.csv)
