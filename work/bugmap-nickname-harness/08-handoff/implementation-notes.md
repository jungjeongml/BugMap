### 승인 화면과 검증 근거

BugMapHarness Page 1의 편집 가능한 모바일 프레임은 390 × 844 px 세 개다. 저장 가능 프레임의 ‘시작하기’를 클릭해 기존 발견 지도 41:81에 도착하는 것을 Figma 플레이어에서 확인했다.

| 상태 | Figma | 네이티브 캡처 |
| --- | --- | --- |
| 첫 입력 | [182:551](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=182-551) | [빈 입력과 비활성 버튼](../06-figma/captures/nickname-setup--initial.png) |
| 저장 가능 | [182:671](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=182-671) | [숲길관찰자와 활성 버튼](../06-figma/captures/nickname-setup--ready.png) |
| 입력 오류 | [182:790](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=182-790) | [숲과 인라인 오류](../06-figma/captures/nickname-setup--invalid.png) |

[실행 가능한 Figma 프로토타입](https://www.figma.com/proto/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=182-671&scaling=scale-down) · [클릭 기록](../07-validation/player-runtime.json) · [검증 보고서](../07-validation/report.md)

### 인증 이후 진입과 저장

- 현재 `AuthFlow`의 인증 완료 및 세션 복구 분기는 발견 지도로 이어진다. 제품 구현 시 서버가 확인한 BugMap 닉네임 설정 상태에 따라 분기한다. 신규 가입 또는 미설정 계정의 재진입은 설정 화면, 이미 BugMap 닉네임을 저장한 계정은 기존 발견 지도다. 소셜 제공자가 내려준 표시 이름은 설정 완료의 판정 근거가 아니다. [현재 인증 흐름](../../../src/features/auth/AuthFlow.tsx) · [발견 지도](../../../src/features/discovery-map/DiscoveryMapScreen.tsx) · [승인 흐름](../03-structure/flows.mmd)
- 유효한 값을 입력해 ‘시작하기’를 누르면 저장을 요청한다. 요청 중에는 ‘저장 중’을 표시하고 응답까지 다시 누를 수 없게 한다. 저장 성공이 확인되면 지도에 진입한다. 실패하면 편집한 원문을 보존하고 ‘닉네임을 저장하지 못했어요. 다시 시도해 주세요.’ 안내와 재시도 경로를 표시한다. 미저장 상태로 이탈하거나 앱을 닫으면 다음 진입에서 설정을 요구한다. [전체 상태표](../03-structure/states.csv) · [표시 문구](../05-design-system/copy.json)
- 현재 [TDD](../../../docs/TDD.md)의 `display_name`과 별도로 BugMap 닉네임 설정 완료를 어떻게 표현할지 구현에서 결정한다. 인증 복구와 저장의 API 계약, 기존 계정 이관 방식은 [미결정 항목](open-items.md)에 기록했다.

### 입력 판정과 복구

| 상황 | 동작 |
| --- | --- |
| 빈 첫 입력 또는 모두 지움 | 예시 힌트와 길이 안내를 표시하고 버튼을 비활성화한다. 오류 표시는 해제한다. |
| 한글 조합 중 | 직전 도움말 또는 오류 안내를 유지하고 ‘시작하기’를 비활성화한다. 조합이 끝난 값을 평가하고 완료나 포커스 이탈이 겹쳤다면 평가 뒤 처리한다. |
| 시안 기준에 맞는 입력 | 앞뒤 공백을 제외해 2~12자일 때 활성화한다. 키보드 ‘완료’는 키보드를 닫는다. 저장 요청은 화면의 ‘시작하기’에서 발생한다. |
| 공백만 입력, 1자 또는 13자 이상 | 첫 오류는 키보드 완료 또는 포커스 이탈 시 표시한다. 사용자가 입력한 원문을 보존한다. 공백만·1자는 ‘닉네임을 2자 이상 입력해 주세요’, 13자 이상은 ‘닉네임을 12자 이하로 입력해 주세요’를 사용한다. |
| 오류 표시 후 수정 | 확정된 값이 계속 무효이면 안내를 갱신하고, 유효하면 오류를 즉시 해제한다. 오류를 완료 키로 확인한 경우 입력 포커스를 유지하며, 외부를 눌러 이탈했다면 포커스를 가져오지 않는다. |

2~12자는 승인된 시안의 규칙이다. 제품의 글자 단위, 허용 문자, 중복 및 변경 정책은 구현 전 확정한다. [수용 기준](../01-prd/requirements.csv) · [문구 원본](../05-design-system/copy.json)

### 레이아웃과 접근성

| 기준 화면 | 입력란 x / y / 크기 | 버튼 x / y / 크기 | 시연 키보드 시작 |
| --- | --- | --- | --- |
| 390 × 844 | 20 / 294 / 350 × 52 px | 20 / 472 / 350 × 48 px | y=540 |
| 360 × 800 | 20 / 262 / 320 × 52 px | 20 / 436 / 320 × 48 px | y=504 |

- 세 상태의 제목, 공개 이름 안내, 닉네임 레이블, 입력란, 도움말·오류, 버튼 위치를 일관되게 유지한다. 실제 화면은 운영체제 키보드와 안전 영역에 반응하게 구성하고 입력·안내·버튼에 접근할 수 있도록 한다. 캡처의 키보드는 레이아웃을 확인하는 예시다.
- 입력 레이블과 안내를 보조 기술에 연결하고 오류 발생 시 텍스트로 알린다. 포커스·오류·비활성·저장 중 상태가 색과 함께 구별되어야 한다. 주요 조작 영역은 최소 44 × 44 px다. 글자 확대에서 도움말과 오류가 필요한 만큼 줄바꿈되도록 확인한다.
- 제품은 승인 Pretendard Medium/Bold를 기준으로 한다. Figma의 Noto Sans KR Medium/Bold는 현재 데스크톱에서 Pretendard가 가용하지 않아 사용한 대체 서체다. [토큰](../05-design-system/tokens.json) · [좌표](../05-design-system/layout.json) · [컴포넌트](../05-design-system/components.json) · [아이콘과 자산](assets/README.md)

### 검수 결과

Figma 358개 노드의 검사 이슈는 0건이다. 두 크기의 HTML 시안 6건에서도 검사 이슈와 승인 캡처 대비 변경 픽셀이 각각 0건이었다. 기존 로그인과 지도, 프로토타입 시작점은 제작 전후가 일치했다. [Figma 검사](../07-validation/figma-lint.json) · [웹 검사](../07-validation/web-lint.json) · [보존 기록](../06-figma/preservation.json) · [수용 기준 대조](../07-validation/coverage.csv)
