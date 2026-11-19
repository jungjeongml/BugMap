# 진행 기록

## 2026-11-09 — 작업 규칙 설정

- 완료: 루트 `AGENTS.md`에 기준 문서의 역할, 작업·검증 원칙, 완료 기록 규칙을 작성했다.
- 산출물: [AGENTS.md](../AGENTS.md).
- 검증: `docs/PRD.md`, `docs/DESIGN.md`, `docs/TDD.md`와 이 기록 파일의 존재를 확인하고 규칙의 참조 경로를 검토했다. 문서 변경으로 실행 테스트는 해당하지 않는다.
- 남은 일: 구현이 시작되면 실제 실행·테스트 명령을 확정해 문서화한다.

## 2026-11-09 — 발견 지도 디자인 기준 반영

- 완료: `docs/DESIGN.md`에 메인 / 발견 지도 화면의 지도 전용 색상, 전체 지도·하단 검색 패널 구성, 조작부, 마커·현재 위치, 5개 내비게이션 항목을 추가했다. 작은 필터 탭 제외와 시안·구현 범위의 차이도 명시했다.
- 산출물: [DESIGN.md](../docs/DESIGN.md), 기준 [화면 캡처](../design/main-map/4:150.png). Figma 기준 노드: `4:150`.
- 검증: 저장된 화면 캡처를 시각적으로 확인하고 지도 생성 소스·PRD와 대조했다. 문서 내 로컬 참조 경로와 추가 색상 값도 확인했다. 이번 작업에서는 Figma 화면을 수정하지 않았다.
- 남은 일: 구현 시 10px 보조 문구 크기와 시스템 아이콘을 공통 규칙에 맞추고, 확장 패널·키보드·검색 결과·권한·오류 상태를 별도로 설계한다.

## 2026-11-09 — 발견·채집 기록 작성 화면 디자인

- 완료: 로컬 Figma `BugMap`의 메인 오른쪽에 `03 · 발견·채집 기록 / 모바일`(390×844, `13:433`)과 `전체 펼침`(390×1432, `12:235`)을 추가했다. 사진 촬영·첨부, 곤충명·관찰/채집, 위치·공개 범위, 발견 날짜·시간, 관찰 글, 비활성 저장 버튼을 편집 가능한 레이어로 구성했다.
- 산출물: [모바일 캡처](../design/record-entry/13:433.png), [전체 캡처](../design/record-entry/12:235.png), [디자인 기준](../docs/DESIGN.md). 기존 메인·로그인 화면은 유지했다.
- 검증: 최종 두 캡처를 시각적으로 확인해 정렬·여백·텍스트 잘림과 폼 순서를 검수했다. Figma 구조 조회로 프레임 크기와 텍스트·프레임·도형 구성을 확인했다. 지도 배경만 기존 이미지를 재사용했다. 앱 코드 변경은 없어 실행 테스트는 해당하지 않는다.
- 남은 일: 메인에서의 프로토타입 연결·실제 스크롤 및 입력 기능은 미구현이다. 첨부 후 상태·선택기·키보드·권한/오류·입력 완료 상태는 후속 설계 대상이다. 사진 한도·위치 공개 기본값과 해상도는 기존 미결정으로 유지한다.

## 2026-11-09 — Expo 초기 설정·선택 로그인 화면 코드 작성

- 완료: Expo·React Native·TypeScript 설정 파일과 로그인 화면 코드를 작성했다. 사용자 선택 프레임 `2:3`을 기준으로 브랜드·소개 카드·소셜 버튼·보조 동작·안내를 구성했다. 최초 구현은 Figma 아이콘을 내보냈으나, 2026-11-09 규칙 변경으로 제거하고 Lucide 컴포넌트로 교체했다. 원본 Figma의 임시 복제본은 삭제했다.
- 산출물: [README](../README.md), [앱 진입점](../App.tsx), [로그인 화면](../src/features/auth/LoginScreen.tsx), [아이콘 연결](../src/features/auth/AppIcon.tsx), [소개 카드](../src/features/auth/FeatureCarousel.tsx), [Figma 참조 캡처](../design/login/reference/2:2.png), [계획·검증 기록](../docs/superpowers/plans/2026-11-09-login-screen.md). PRD·TDD·DESIGN의 현재 구현 상태와 시안 차이도 갱신했다.
- 검증: 자산 16개 파일·치수·참조 검사 통과. TS/TSX 6개 문법 변환 진단 0개, JSON 4개 구문 확인. 별도 정적 코드 리뷰에서 페이지 표시 버튼의 작은 터치 영역을 지적받아 44×44로 보정했다. 실제 화면 캡처는 Figma 참조만 있으며 앱 실행 결과가 아니다.
- 미완료: npm 온라인 설치는 `ENOTFOUND`, 오프라인 설치는 `ENOTCACHED`로 실패했다. 전체 타입 검사는 미설치 모듈·Expo 기본 설정을 찾지 못해 실패했고 웹 시작은 `expo: command not found`로 실패했다. 설치·lockfile·번들·네이티브/웹 실행·구현 캡처 검수는 미완료다. 네트워크 복구 후 README 명령으로 확인해야 한다. 인증·서버·이메일/비회원 이동·정책 연결은 사용자 요청대로 미구현이다.

## 2026-11-09 — Figma 아이콘 금지·Lucide 규칙 적용

- 완료: `AGENTS.md`에 공통 아이콘 출처 규칙을 추가하고 로그인 화면의 16개 Figma PNG 아이콘을 Lucide 컴포넌트로 교체했다. 소셜 버튼은 Lucide의 일반 메시지·검색·기기 아이콘을 표시한다. 사용하지 않는 PNG·출처 목록·검사 스크립트를 제거했다.
- 산출물: [AGENTS.md](../AGENTS.md), [아이콘 매핑](../src/features/auth/AppIcon.tsx), [로그인 화면](../src/features/auth/LoginScreen.tsx), [DESIGN.md](../docs/DESIGN.md), [TDD.md](../docs/TDD.md), [README](../README.md).
- 검증: 코드·문서에서 `assets/login` 참조가 남지 않았음을 검색으로 확인하고 `package.json` JSON 형식을 확인했다. 앱 화면 캡처와 타입 검사는 Lucide/Expo 의존성이 아직 설치되지 않아 실행하지 못했다. 오프라인 lockfile 동기화도 `ENOTCACHED`로 실패했다. `package-lock.json`은 있으나 새 Lucide 의존성은 반영되지 않았다.
- 남은 일: 네트워크 복구 후 의존성 설치, Expo 호환성·타입 검사·실행 캡처 확인.

## 2026-11-09 — Lucide 의존성 설치 시도

- 사용자가 `npm install`, `npx expo install --check`, `npm install lucide-react-native`를 완료했다고 알려 설치 상태를 다시 검증했다. `lucide-react-native@1.70.0`, `react-native-svg@15.16.1`을 확인했다.
- 검증: `npm run typecheck` 통과. `npm run export:web` 통과(웹 번들 2,266 모듈). `npm ls lucide-react-native react-native-svg --depth=0` 통과. `npx expo install --check`는 네트워크 비활성으로 로컬 호환성 표만 사용했고 SVG 15.16.0 권장과 15.16.1 설치 간 패치 차이를 알렸다. 이를 설치하려는 `npx expo install react-native-svg`는 registry DNS `ENOTFOUND`로 실패했다. 이후 사용자가 열어둔 앱 호스트 `http://127.0.0.1:8081`에 Ego Browser로 접속해 390px 화면을 검수하고 [구현 캡처](../design/login/implementation.png)를 저장했다. 17개 Lucide SVG의 렌더링과 두 번째 소개 인디케이터를 눌렀을 때 가로 스크롤되는 동작을 확인했다.
- 추가 변경: React Native 0.88의 `ScrollViewInstance` 타입 정의에 맞춰 소개 카드 ref 타입을 수정했다. 웹 번들과 타입 검사에 반영된 상태다.
- 남은 일: 온라인에서 Expo SVG 호환 패치 적용 후 `npx expo install --check` 재확인, 실제 기기 검증.

## 2026-11-09 — 웹 SVG accessible 속성 오류 수정

- 원인: `AppIcon`의 `accessible={false}`가 웹 SVG DOM으로 전달되어 React 개발 모드에서 비 boolean 속성 오류가 출력됐다. Ego Browser의 개발 콘솔에서 메시지를 확인했다. 앞선 화면 중심 검증에서 콘솔 오류를 놓쳤다.
- 변경: [AppIcon](../src/features/auth/AppIcon.tsx)에서 웹은 `aria-hidden`, 네이티브는 `accessible={false}`를 전달한다. README·TDD의 설치 및 검증 상태도 갱신했다.
- 검증: 타입 검사·웹 번들·Expo 의존성 검사 모두 통과. SVG 15.16.0 설치 확인. 개발 서버 새로고침 후 앱 콘솔 오류 0건, 렌더링된 SVG 16개 모두 `aria-hidden=true`, `accessible` DOM 속성 0개를 확인했다. [390×844 구현 캡처](../design/login/implementation.png)를 다시 저장하고 시각 검수했다.
- 남은 일: 실제 iOS·Android 기기 검증.

## 2026-11-13 — AI 디자인 하네스 플러그인 설계 문서

- 완료: [DESIGN.md](../docs/DESIGN.md)에 PRD → 리서치 → 화면 구조 → 와이어프레임 → 디자인 시스템 → 피그마 → 검증 → 핸드오프의 8단계 표를 추가했다. 각 단계의 파일·통과 조건·사람 승인 기본값, 사용하는 저장소의 `work/<프로젝트>/` 저장 계약, 상태·재개·재승인 규칙을 명시했다. 사용자 확정 사항과 설계 제안을 구분했다.
- 검증: 문서 검토 에이전트가 구현 계획을 막는 중요한 누락·모순이 없다고 확인했다. 8단계 표·열 구성, 기존 YAML 토큰과 곤충맵 디자인 본문 보존을 검사했고 `git diff --check`를 통과했다. 문서만 변경했으므로 앱 실행·화면 캡처 검증은 수행하지 않았다.
- 남은 일: 승인 정책 검토와 배포 플랫폼·실행 인터페이스·승인자 식별·Figma 도구·리서치 예산·재시도 정책 결정 후 플러그인 구현. 이번 작업에서는 코드·실행 산출물 폴더를 생성하지 않았다.
- 커밋 미완료: 요청에 따라 두 문서의 커밋을 시도했으나 현재 세션의 `.git` 읽기 전용 제한 때문에 `index.lock` 생성이 거부됐다. 문서 변경은 작업 폴더에 보존돼 있으며 Git 쓰기 권한이 있는 환경에서 커밋해야 한다.

## 2026-11-13 — 공통 디자인 지침과 개별 명세 분리

- 완료: [DESIGN.md](../docs/DESIGN.md)에는 공통 디자인 기준·토큰과 문서 안내만 남겼다. [메인 지도](../docs/screens/main-map.md), [기록 작성](../docs/screens/record-entry.md), [로그인](../docs/screens/login.md) 화면 명세와 [AI 디자인 하네스](../docs/design-harness.md)를 분리했다. 지도 전용 색상 토큰도 메인 지도 문서로 이동했다. AGENTS·README의 문서 안내와 상대 링크를 갱신했다.
- 검증: 새 문서의 로컬 링크, 하네스 8단계 표 보존, 공통 문서의 화면별 명세 제거, `git diff --check`를 확인했다. 문서 정리로 UI·코드 변경이 없어 앱 실행·캡처 검증은 해당하지 않는다.
- 남은 일: 앞서 요청된 커밋은 `.git` 쓰기 권한 제한으로 미완료 상태다. 하네스 구현은 이번 작업 범위에 포함하지 않는다.

## 2026-11-13 — 문서 정리 및 프로젝트 설정 커밋

- 반영: 공통·화면별 디자인 문서 분리와 [디자인 하네스 명세](../docs/design-harness.md), AGENTS·README 안내, [.codex/config.toml](../.codex/config.toml)의 프로젝트 Git 쓰기 권한 설정을 함께 커밋한다. 앞선 커밋 실패 기록의 후속 작업이다.
- 검증: 로컬 문서 링크 56개와 `git diff --check` 통과. 설정 내용은 직접 검토했으나 시스템 Python에 `tomllib`이 없어 TOML 파서 검증은 수행하지 못했다. 앱 코드·UI 변경이 없어 실행·캡처 검증은 수행하지 않았다.
- 남은 일: 하네스 플러그인 구현과 기존 기기 검증 항목은 별도 후속 작업이다.

## 2026-11-13 — design-harness CLI 뼈대

- 완료: [독립 Node 20 패키지](../tools/design-harness/package.json), [검사·승인 코어](../tools/design-harness/harness.mjs), [CLI](../tools/design-harness/bin/design-harness), [통합 테스트](../tools/design-harness/test/cli.test.mjs)를 작성했다. `check`는 현재 단계·누락·오류·승인 유효성을 읽기 전용으로 판정한다. `approve <단계> --by <이름>`은 `work/<프로젝트>/control/approvals.json`에 SHA-256·승인자·UTC 시각·선행 승인 ID를 추가하며, 파일 추가·수정·삭제와 선행 재승인 시 승인이 무효화된다. 외부 의존성은 추가하지 않았다.
- 문서: [사용법·JSON 계약·복구 절차](../tools/design-harness/README.md), [하네스 설계](../docs/design-harness.md), [기술 결정](../docs/TDD.md), [구현 계획](../docs/superpowers/plans/2026-11-13-design-harness-cli.md)을 갱신했다. 앱의 Node 22.13+ 요구사항과 CLI의 Node 20+ 요구사항을 분리했다.
- 검증: 초기 미구현 테스트 실패 확인 후 구현. Node 22.17.0 `npm test` 및 Node 20.20.2 직접 실행에서 각각 15개 통과. 승인 변경·상하위 의존성·손상 기록 보존·경로 탈출·심볼릭 링크·쓰기 잠금을 검사했다. 독립 검토도 중요 문제 없이 15개 테스트 통과. 앱 타입 검사, 로컬 문서 링크 11개, `git diff --check` 통과. 실제 저장소 check는 아직 `work/bugmap`이 없어 PRD 누락 및 종료 코드 1을 반환함을 확인했다. UI 변경이 없어 캡처는 수행하지 않았다.
- 남은 일: 의미·디자인 품질·실제 Figma 검증, 조건부 승인 정책, `stages.json` 영속화·원본 입력 추적·산출물 버전 사본 보관·승인자 인증은 후속 구현이다. 현재 `passed`는 구조 검사 범위의 통과다.

## 2026-11-13 — 단계별 생성·검사 및 Playwright 캡처 비교

- 완료: [CLI 0.2.0 사용법](../tools/design-harness/README.md)에 맞춰 `refs:capture`(레퍼런스 PNG·출처/viewport/해시), `wireframe`(JSON→편집 가능한 SVG·실제 PNG), `design-md`(tokens/components/copy→DESIGN.md), `lint:web`(실제 계산된 색·글자 크기·44px 버튼·금지 문구), `review`(사람 점수/메모·입력 해시), `handoff`(승인 버전·구현 메모·미해결 항목→HANDOFF.md/manifest)를 구현했다. check/approve가 필수 산출물·현재 입력/출력 해시·lint 위반·최신 리뷰를 검사한다. 기존 파일 재생성은 --force가 필요하고, 루트 DESIGN.md·제품 UI는 변경하지 않았다.
- 기술: Node 20·외부 npm 런타임 의존성 없음. 캡처/웹 검사는 설치된 Chromium의 별도 임시 프로필과 CDP pipe를 사용한다. [기술 결정](../docs/TDD.md)·[설계](../docs/design-harness.md)·[구현 계획](../docs/superpowers/plans/2026-11-13-design-harness-stages.md)을 갱신했다. 리뷰 최소 점수는 구현 기본 4/5이며 프로젝트 설정으로 조정한다.
- 검증: Node 20.20.2의 전체 npm test 26개 통과(브라우저 테스트 skip 0). 실제 localhost/Chrome으로 캡처·CSS 상속·반응형·가상 요소·분할된 금지 문구·승인된 전달 흐름을 확인했다. Node 22의 단계/승인 테스트 및 앱 타입 검사, 로컬 문서 링크 12개, diff 검사를 통과했다. 독립 검토의 captures 화면 ID 오판과 visibility:visible 자식 검사 누락을 수정했다. visibility 문제는 실제 브라우저의 실패→성공을 확인했고, captures 회귀 테스트는 기존 잘못된 휴리스틱을 일시 복구하면 실패하고 수정 코드에서는 통과함을 별도 확인했다.
- Playwright: 사용자 요청에 따라 [별도 QA 비교 스크립트](../tools/design-harness/qa/README.md)를 추가했다. Playwright 1.65.0은 저장소 의존성을 바꾸지 않고 임시 설치했다. 390×844 [실제 캡처](/private/tmp/design-harness-qa/playwright-web/actual.png)·[diff](/private/tmp/design-harness-qa/playwright-web/diff.png)에서 하네스 캡처와 234픽셀(0.07109%) 차이를 확인했으며 일부 글리프 주변에 차이가 보인다. 같은 Playwright 설정의 재캡처는 [차이 0개](/private/tmp/design-harness-qa/playwright-repeat/comparison.json)였다. 와이어프레임 PNG도 열어 한글·배치·잘림을 확인했다. 이들은 테스트용 임시 산출물이며 곤충맵 실제 디자인 검증이 아니다.
- 남은 일: 클릭 후 상태·키보드 흐름·닫힌 shadow DOM·이미지 픽셀·네이티브·실제 Figma 및 요구사항/화면 커버리지 검증, stages.json 영속화·버전 사본·인증된 검토자·조건부 승인 정책은 별도 구현이다.

## 2026-11-13 — 단계별 에이전트·스킬과 사람 직접 승인 흐름

- 완료: [design-flow](../.agents/skills/design-flow/SKILL.md)와 리서치·구조/와이어프레임·시스템·Figma·새 맥락 비평가의 역할 스킬 5개, [.codex/agents](../.codex/agents/)의 역할 TOML 5개를 추가했다. 리서치는 실제 캡처의 관찰·가져올 점·피할 점·해석/미검증을 구분하고, 비평은 매번 새 인스턴스/새 맥락에서 원본·캡처를 확인한다. 전체 담당·경로·재개는 [안내](../docs/design-agents.md)에 정리했다.
- 승인: 모든 AI 역할이 approve/review 실행과 사람 승인/점수 JSON 대행을 하지 않도록 명시했다. 채팅의 승인 요청에도 사람이 직접 명령을 실행해야 하며 1·4·5·7·8의 유효 승인이 없으면 후속 역할을 시작하지 않고 멈춘다. AI 비평은 critique.md, 재개 메모는 control/flow.md에 둔다. 실제 CLI·전역 설정·모델·권한은 바꾸지 않았다.
- 검증: 스킬 없는 기준 행동에서 채팅 승인을 CLI에 대신 기록하려는 행동을 확인했다. 스킬 적용 후 6개 대표 사례에서 대행 금지·승인 대기·이미지 직접 열람·상태 설계·시스템 충돌 반환·Figma 미연결 차단·새 맥락 비평을 확인했다. [평가 기록](../docs/design-agent-evals.md)에 기준/적용 결과와 한계를 남겼다. Codex CLI 0.167.0에서 역할 5개·스킬 6개 실제 카탈로그 발견을 확인했고, YAML 파싱·UI 메타데이터·로컬 참조 및 독립 검토를 통과했다. Python quick_validate는 PyYAML 부재로 실행되지 않아 기존 js-yaml 파싱·실제 Codex 로드로 대체했다. 제품 UI 변경이 없어 새 제품 캡처나 브라우저 회귀 테스트는 수행하지 않았다.
- 남은 일: 실제 프로젝트에 $design-flow를 적용해 사람의 직접 승인과 함께 순차 실행하기. 이번 작업은 에이전트/스킬 추가이며 제품 디자인 실행·실제 Figma 작업·사람 승인/점수 기록은 수행하지 않았다. 읽기 전용/사람 전용 규칙은 행동 지침이고 별도 OS 권한·신원 인증/전자서명을 구현한 것은 아니다.

## 2026-11-13 — Figma 안전 훅·노드 lint·설치 플러그인

- 완료: [Figma 계약/설치 안내](../tools/design-harness/FIGMA.md), [노드 검사](../tools/design-harness/figma.mjs), [세 훅](../tools/design-harness/hooks/hooks.json)을 구현했다. PreToolUse는 현재 시스템 승인·대상 fileKey 일치를 검사하고 불확실하면 차단한다. PostToolUse는 원격 노드 재내보내기·캡처 검수·재검사를 안내한다. Stop은 읽기 전용 check를 실행하며 사람 대기에서 무한 재개하지 않는다. control/figma.json은 공통 승인 해시에 포함한다.
- 완료: lint:figma는 화면/상태 매핑·노드 계약·색/글자 크기·금지 문구·44px 조작 영역·자동 레이아웃·기록된 컴포넌트를 검사한다. check가 현재 입력으로 재계산하므로 보고서 누락/변경/위반은 후속 승인·handoff를 막는다. [플러그인](../tools/design-harness/plugin.json)과 [마켓플레이스](../.agents/plugins/marketplace.json)에 CLI·스킬·역할 지침을 묶었다. 설치 두 명령은 FIGMA.md에 있다.
- 검증: 실패 테스트 확인 후 구현. Node 22 전체 35/35 통과(실제 Chromium 포함, skip 0). Node 20 승인/단계 회귀 33/33 및 최신 Figma/설치 테스트 9/9 통과(중복 포함). 임시 Codex 설정에서 marketplace add → plugin add 및 설치본 CLI/세 훅 명령을 확인했다. 타입 검사·번들 일치·문서 로컬 링크·diff 검사 통과. 독립 검토 Important/Critical 없음. 숫자 파일 키/시각 거부도 실패→수정→통과 확인했다. UI 변경이 없어 새 제품 캡처 검수는 해당하지 않는다.
- 남은 일/한계: 사용하는 환경에 플러그인 설치·활성화 후 사용자가 훅을 직접 검토/신뢰해야 작동한다. 실제 원격 Figma 작업·노드 재내보내기·시각 검수·사용자 환경 신뢰 승인은 이번에 수행하지 않았다. 로컬 JSON은 원격 진위/최신성·실제 변수 바인딩·동작을 인증하지 않는다. 사람 승인/리뷰 대행·전역 설정 변경·원격 push는 하지 않았다.

## 2026-11-13 — 로그인 화면 하네스 첫 실행 · PRD 승인 대기

- 진행: 사용자 요청의 현재 Figma 페이지 로그인 재디자인을 [bugmap-login 실행](../work/bugmap-login/README.md)으로 시작했다. 참조 대화를 read_thread로 읽고 실제 연결 BugMap/Page 1(0:1) 및 기존 로그인 1:2·2:2를 조회했다. [현재 원격 캡처](../work/bugmap-login/01-prd/baseline/) 두 개를 새로 저장하고 직접 열었다. 기존 Figma 노드/앱 코드는 변경하지 않았다.
- 준비: [로그인 PRD](../work/bugmap-login/01-prd/PRD.md), 요구사항 CSV, 원본 문서 SHA-256·대상 파일/보존 범위·제안/충돌 기록·[재개 메모](../work/bugmap-login/control/flow.md)를 작성했다. 새 맥락 design_critic의 [비평 원문](../work/bugmap-login/01-prd/critique.md)을 보존했다. 판정 ready, 약관/정책 동작 CSV 추적성 경미 지적 1건은 구조 단계 대응 필요로 남겼다.
- 검증: check는 prd=awaiting_approval/canApprove=true, 후속 단계 blocked. 원본 문서 해시 일치 및 diff 검사 통과. [직접 정책 함수 진단](../work/bugmap-login/control/harness-diagnostic.json)에서 시스템 미승인 Figma 쓰기 deny와 Stop 현재 단계 반환을 확인했다. 실제 MCP 쓰기 시도나 자동 runtime 훅 차단 검증은 하지 않았다. 플러그인 목록 installed=[]로 현재 자동 훅 적용은 확인되지 않았다. 브리지의 읽기 도구 일부도 쓰기로 분류되는 보완점을 기록했다.
- 남은 일: 사람이 로그인 범위·제공자·브랜드 공식 자산 예외를 검토하고 approve prd --project bugmap-login --by 본인명 실행. 유효 승인 후 research부터 순차 진행하고 4·5·7·8 사람 승인도 지킨다. 새 로그인 디자인/Figma 편집·최신 브랜드 리서치·노드 lint·최종 전달은 미완료다. 사람 승인/리뷰 대행, 훅 자동 신뢰, 전역 설치, 커밋은 수행하지 않았다.

## 2026-11-13 — 로그인 리서치·구조·와이어프레임 · 4단계 승인 대기

- 확인: 사용자 직접 PRD 승인(jungmin, ID 20dc1b08-a6d8-487f-87cb-9c6c9464ce9b)이 현재 입력 해시와 일치해 passed임을 확인하고 순차 재개했다. 사람 승인/리뷰를 에이전트가 생성·수정하지 않았다.
- 완료: [공식 자료 리서치](../work/bugmap-login/02-research/sources.md), 실제 PNG 3개·실패 보존 1개, 관찰·추천·한계를 작성했다. 새 맥락 비평 ready 및 기계 검사 통과. 승인 PRD의 일반 UI Lucide/브랜드 공식 자산 예외를 [공통 기준](../docs/DESIGN.md)·[로그인 기준](../docs/screens/login.md)에 반영했다. 착수 해시는 보존하고 변경 후 해시·승인 근거를 control/flow.md에 기록했다.
- 준비: [두 크기·10상태 전체 비교](../work/bugmap-login/04-wireframes/index.html), [행동·요구사항 추적](../work/bugmap-login/03-structure/behavior.md), SVG 20개·실제 PNG 20개·검수/해시를 작성했다. 상태 문구에서 기술 주석을 분리했다. 새 맥락 비평가가 20 PNG를 모두 직접 확인했다. 정책 검토판 전이 CSV 두 셀의 경미 불일치를 수정한 뒤 다른 새 맥락 비평에서 ready를 확인했다. [최초 비평](../work/bugmap-login/04-wireframes/critique.md)·[변경 범위 비평](../work/bugmap-login/04-wireframes/critique-transition.md) 원문을 보존했다. 상태표의 지원정보 분기 요약 명료화는 비차단 경미 제안으로 남으며 상세 flows/behavior가 구현 기준이다.
- 검증: prd/research/structure passed, wireframes awaiting_approval/canApprove=true. PNG·SVG 40개 증거 해시 일치, CSV·JSON 20상태쌍 대조, 버튼 48px·조작 영역 44px 이상·두 화면 경계, 비교 페이지 로컬 링크 63개 및 diff 검사 통과. 조정자도 대표 기본/컴팩트·로딩·오류·미지원·정책 캡처를 직접 열었다. 제품 코드 변경이 없어 앱 테스트는 반복하지 않았다.
- 남은 일: 사람이 wireframes 승인을 직접 실행한 뒤 시스템 단계로 진행한다. 공식 브랜드 원본 자산·한국어 Apple·최종 색/폰트·실제 Figma 새 프레임은 아직 미작성이다. 인증 SDK·동적 스크롤·실기기 접근성·정책 링크·최종 검증은 미완료다. 자동 훅 설치/신뢰, 원격 Figma 쓰기·기존 노드 변경·커밋은 수행하지 않았다. [재개 메모](../work/bugmap-login/control/flow.md)에 사람 명령과 미검증 항목을 남겼다.

## 2026-11-13 — 로그인 디자인 시스템 · 5단계 승인 대기

- 확인: jungmin의 와이어프레임 승인(ID df0fd77a-a4a2-4800-b7e3-a9392d037a8b)이 현재 산출물과 일치한다. 1~4단계 passed를 확인한 뒤 05-design-system만 진행했다.
- 준비: [시스템·상태 검토 페이지](../work/bugmap-login/05-design-system/index.html), [대표 화면](../work/bugmap-login/05-design-system/captures/390x844-default.png), [컴포넌트 보드](../work/bugmap-login/05-design-system/captures/components-board.png), tokens/components/copy JSON·생성 DESIGN.md·실제 PNG 23개를 작성했다. 카카오·네이버는 사용자 제공 원본, Apple은 공식 한국어 버튼 API 원본을 사용했다. 네이버는 검정 문구의 공식 흰색형을 선택하고 녹색형의 3.09:1 대비 한계를 분리했다. [출처·배율](../work/bugmap-login/05-design-system/asset-sources.md)과 [자체 검수](../work/bugmap-login/05-design-system/self-check.md)에 실제 대체 폰트·한계를 기록했다.
- 검토: 전체 새 맥락 비평 ready에서 발견한 복구 버튼의 2px 너비 차이를 최소 CSS 수정으로 해결했다. 390px에서 173/173×48px, 360px에서 158/158×48px를 재렌더로 확인했다. 사용량 제한으로 중단된 변경 범위 비평을 새 맥락에서 재개해 ready/수정 필요 없음으로 완료했다. [전체 비평](../work/bugmap-login/05-design-system/critique.md)·[변경 범위 비평](../work/bugmap-login/05-design-system/critique-recovery.md) 원문을 보존했다.
- 검증: 20상태 렌더 검사 이슈 0, 로컬 HTML의 실제 클릭 전이 3개 통과. 입력/산출물 해시 149개 일치와 사용자 원본 78개 변경 없음을 조정자도 확인했다. 수정된 오류 화면 두 크기를 직접 열었다. 기계 check는 design-system awaiting_approval/canApprove=true, 이후 단계 blocked다. 제품 코드 변경이 없어 앱 테스트는 반복하지 않았다.
- 남은 일: 사람이 시스템 시각 방향을 승인해야 Figma 단계로 진행한다. 자동 훅 설치/신뢰·브리지 읽기 도구 분류·공식 PNG의 IMAGE-fill lint 지원은 후속 과제이며 아직 해결됐다고 주장하지 않는다. 실제 Figma 편집·최종 검증·인증 SDK·실기기 접근성·정책 연결은 미완료다. 사람 승인/리뷰 대행·사용자 자산 변경·기존 Figma 노드 변경·커밋은 수행하지 않았다. 재개 명령과 사람 승인 명령은 [flow.md](../work/bugmap-login/control/flow.md)에 있다.
# 2026-11-13 — 정식 Figma 대상 확인·준비 코드 보완

- 사용자 URL의 정식 파일 키 `LynbxdW8Qf7TavCrPLd2nY`를 공식 Figma get_metadata로 확인. 기존5루트 ID/위치/크기 일치. 응답: `work/bugmap-login/06-figma/official-metadata.xml`.
- CLI/플러그인0.3.1: manifest 기반 공식 PNG 이미지 매핑 검사, 회전/불투명도/비율 검사, 브리지 조회 도구 분류, Finder 일반 `.DS_Store` 해시 제외. 사람 로그는 변경하지 않음.
- 검증: npm test39/39(skip0, 실제 Chromium 포함), bundle-skills --check, git diff --check 통과. 독립 코드 검토와 수정: `work/bugmap-login/06-figma/prerequisite-review.md`.
- 정식 대상 등록은 실제 공통 입력 변경이므로1·4·5 사람 재승인 대기. 기존 승인 대비 차이는 `control/figma.json`만 확인(`06-figma/target-check.json`). 이전 설정/변경 이유/재개 명령은 control/history/·figma-target-update.md·flow.md. 05 시스템 원본과 기존 승인 로그 유지.
- 남은 일: 사람 재승인 확인 뒤 새 Figma 프레임·실제 원격 노드/캡처·대응HTML·lint·독립 비평·사람 검증7. 원격 쓰기0건. 자동 훅 설치/신뢰도 아직 미확인. 전체 디자인 작업 완료 아님.

## 2026-11-13 — 로그인 Figma 생성, 검증은 호출 한도로 중단

- 사용자 재승인 후 실제 check에서1~5 passed를 확인했다. 정식 BugMap Page1에 새 로그인20프레임(두크기×10상태), 토큰76·텍스트스타일7·컴포넌트/세트를 공식 Figma 도구로 생성했다. 기본390: https://www.figma.com/design/LynbxdW8Qf7TavCrPLd2nY/BugMap?node-id=72-26 / 기본360: node-id=72-631. 기존5루트는쓰기범위에서제외했다.
- 증거: work/bugmap-login/06-figma/README.md·change-log.md·screen-ledger.json·node-map.json. 공식PNG2개와기존bridge원격PNG20개를저장. 담당자와새맥락비평가는20상태모두직접열었다. 조정자는기본/오류/로딩/미지원/정책대표를직접열었다. 상세raw는8/20만재조회(nodes.partial.json).
- 차단: 공식서버Starter MCP호출한도(quota-blocker.json). 미완료raw를nodes.json으로위장하지않았다. 복구버튼390의172/174→173/173(360목표158/158)·로딩아이콘회색보정도남음. 준비한pending-repair.js는미실행. 전체Figma lint/웹lint·실제인증·프로토타입·기기접근성·사람검증7미완료. 추가승인은현재필요없다.
- 비평: critique-partial.md원문blocked,시각잘림/브랜드왜곡중요발견없음. 매핑20행/capture/HTML경로존재와rawExported8/12를조정자확인해critique-response.md에별도기록. 수정/전체내보내기뒤새맥락재검토필요.
- 코드검증: 실제가드의work일반파일ENOTDIR와native인스턴스자손ID지원문제를실패테스트후수정. 전체npm test41/41(skip0),bundle검사,diff검사통과. 독립코드리뷰Important/Critical없음(prerequisite-review.md). 자동가드플러그인설치/신뢰는미확인,쓰기는매번로컬정책검사후수행했다. 과금변경·사람기록대행·기존bridge쓰기없음.
- 재개: control/flow.md와change-log.md순서대로한도/대상/승인확인→실제보정→20루트원격raw·이미지매핑·캡처갱신→lint/새비평→사람검증7. 단계6과전체프로젝트를완료로기록하지않는다.

## 2026-11-13 — Talk To Figma 연결 후 부분 보정·전체 검증 차단

- 사용자 채널 t0852evy로 설치된 로컬 MCP SDK/stdio 서버를 연결했다. Talk 도구가 현재 세션에 직접 노출되지 않아 절대 bun/server 경로를 사용했고 localhost3055는 샌드박스 밖 실행으로 성공했다. 플러그인/전역 설정은 변경하지 않았다.
- 실제 Page0:1의 보존5루트·신규28루트 대조 및 로컬가드검사 뒤 오류4화면의 복구8INSTANCE를 보정했다.390은173/173px,360은158/158px,높이48px을 실제 전후 조회로 확인했다. 최신PNG20개를 재캡처하고 담당자는 전부, 조정자는 오류2크기·로딩 대표를 직접 열었다.20PNG SHA와20매핑 확인 및 diff검사 통과.
- 산출물: [실행·검수보고](../work/bugmap-login/06-figma/talk-repair-report.md), talk-repair-log.json·전후응답·captures/talk/·갱신 README/node-map/capture-manifest/change-log. 실행스크립트06/scripts/talk-repair.mjs.
- 남은 일: Talk가 VECTOR·boundVariables·imageRef·layoutMode를 생략하고 실제 execute_code를 제공하지 않아 전체raw nodes.json 미완료. LoaderCircle secondary바인딩도 보존 가능한 도구가 필요하다. 최신check는1~5passed,6in_progress(nodes.json누락),7~8blocked다. 기존partial raw는 과거증거로 보존하고 수정4루트 rawExported=false로 구분했다. 전체lint·7단계·사람승인대행은 진행하지 않았다. 연결 보완 후 재개사항은 [flow](../work/bugmap-login/control/flow.md)에 기록했다.
- 독립 비평: [원문](../work/bugmap-login/06-figma/critique-talk-repair.md), 오류4·기본2·로딩1 직접 이미지 확인,20PNG해시일치. 수리범위ready/전체6blocked. fileKey직접확인·비필터raw부족은미검증으로유지.
- 최종 메타데이터 별도 새맥락 [비평](../work/bugmap-login/06-figma/critique-talk-metadata.md)은 지정문서범위ready.20매핑·20PNG해시·과거raw구분일치. 전체6blocked유지.

## 2026-11-13 — 디자인 하네스가 놓친 시각 결함 검사 보완

- 완료: `lint:web`에 레이아웃 규칙(`text-clipped`·`overlap`·`offscreen`·`contrast`)과 승인된 `05-design-system/captures/`와의 픽셀 비교(`visual-diff`, 기준 누락 시 `visual-baseline-missing`)를 추가했다. 승인·리뷰 해시 비교에서 줄바꿈(CRLF/LF)만 다른 텍스트를 같은 내용으로 보게 했다.
- 산출물: [lint 규칙](../tools/design-harness/web-rules.mjs), [lint 실행](../tools/design-harness/browser-commands.mjs), [해시 비교](../tools/design-harness/io.mjs), [CLI 안내](../tools/design-harness/README.md), [하네스 명세](../docs/design-harness.md), 회귀 테스트 2개.
- 검증: `npm test` 43/43 통과. 새 테스트 2개는 수정 전 코드에서 실패함을 확인했다. 임시 복사본의 bugmap-login 42개 실행(20 HTML+screen.html × 2 viewport)에서 새 규칙 오탐 0건, 승인 캡처 차이 0%. 같은 복사본에 결함 9종을 넣었을 때 수정 전 3종 → 수정 후 9종 검출. 새로 받은 저장소에서 `check` 1~5단계 passed(수정 전 4단계 needs_revision).
- 남은 일: 실제 앱 `src/` 화면은 여전히 하네스 검사 대상이 아니다. 다른 OS·글꼴 환경의 허용치, 클릭 후 상태·키보드 흐름, 실제 Figma 노드 시각 비교는 별도다. bugmap-login의 07-validation은 6단계 완료 후 생성해야 한다.

## 2026-11-16 — Figma 기본 도구 선택 지침 확인

- 완료: design-figma 스킬·담당 역할·배포 스킬·Figma 훅을 조회해 TalkToFigmaMCP Plugin을 기본으로 지정하는 규칙이 없음을 확인했다. 현재 지침은 실제 연결된 Figma 도구를 확인하고 대응 스킬을 적용하도록 한다.
- 근거: `.agents/skills/design-figma/SKILL.md`, `.codex/agents/design_figma_builder.toml`, `tools/design-harness/hooks/policy.mjs`. diff로 배포 스킬에는 설치 경로·Figma 계약 안내만 추가됨을 확인했다. 과거 Talk 사용 기록은 기본 도구 설정과 구분했다.
- 검증 범위: 저장소 지침과 현재 노출 도구 목록을 확인했다. Talk의 현재 서버·채널 연결은 검증하지 않았다. 도구 선택 정책 변경은 수행하지 않았다.

## 2026-11-16 — Kyro 참고 로그인 단일 화면 PRD 준비

- 완료: work/bugmap-login-kyro/에 기본 화면1개용 PRD·요구사항·결정·Figma 대상·재개 메모 작성. 기존 bugmap-login 산출물 및 Figma 노드는 보존.
- 실제 확인: example/kyroFirstPage.png 직접 열람. CLI로 Cursor Talk To Figma MCP 채널 b6q2ot0a 연결, Page 1(0:1)과 BugMap-logo-vector(126:706, 1000x310) 조회 및 PNG 직접 확인. 증거는 control/cursor-document.json·cursor-logo.json·logo.png·cursor-preflight.mjs.
- 검증: 새 맥락 design_critic PRD ready, 경미 출처 구분 지적 수정. 01-prd/critique.md에 원문 보존. 최종 check는 PRD awaiting_approval/canApprove true, 후속 blocked.
- 남은 일: 사람 PRD 승인 후 리서치부터 진행. 실제 로그인 디자인 생성은 미수행. 실제 fileKey 및 벡터 상세/내보내기 한계는 후속 확인. 사람 승인·리뷰 대행 없음.

## 2026-11-16 — Kyro 로그인 리서치·구조·와이어프레임 준비

- 완료: PRD 직접 승인 유효 확인 후 work/bugmap-login-kyro/02-research/와03-structure/ 및04-wireframes/ 작성. 기본 login/default390x844 한장만 생성.
- 산출물: 02-research/sources.md·findings.md·recommendations.md·reuse-verification.json 및 공식PNG3개, 03-structure/screens.csv·states.csv·flows.mmd, 04-wireframes/wireframes.json·login/default.svg·captures/login/default.png·review.md·critique.md.
- 검증: 공식 과거캡처 날짜·해시·치수 일치 및 이미지 직접 확인. wireframe CLI 기본 Chromium 실패 뒤 동일명령 escalation승인 실행 exit0. 조정자 실제PNG확인, 기본1개/버튼358x60/간격8px/로고슬롯100:31 확인. 리서치·구조와이어프레임 새맥락 독립비평 모두 ready. 최종check PRD/research/structure passed, wireframes awaiting_approval/canApprove true.
- 한계: 새 원격 리서치캡처 실패/재요청 중단으로2026-11-12 공식캡처를 정직하게 재사용. 현재공식지침·최종색/대비·공식버튼/로고벡터·Figma동일성·실제인증은 미검증.
- 남은 일: 사람이 wireframes 승인 명령 실행 후 디자인 시스템부터 재개. Figma제작은 미시작. 사람승인/리뷰 대행 없음. 재개명령은 control/flow.md.

## 2026-11-16 — Kyro 로그인 디자인 시스템 시안 준비

- 완료: 와이어프레임 승인10b63571-f547-466f-aa49-aa7cf37fbf09 유효확인 후 work/bugmap-login-kyro/05-design-system/에 기본390x844시안1개·토큰·컴포넌트·문구·생성DESIGN.md·아이콘/자산출처·manifest·재현스크립트 작성.
- 산출물: 05-design-system/captures/390x844-default.png, preview.svg, screen.html/styles.css, render-report.json, review.md, critique.md.
- 검증: render localhost EPERM 후 동일명령 escalation승인 실제Chromium캡처. 담당자·조정자·새맥락비평가가 PNG직접확인. 버튼358x60/간격8/overflow없음/이미지비율보존. 제목대비17.74:1, 본문약관7.56:1. 본문토큰14/28정합화 및 로고주요색#107B34측정. 실제폰트Apple SD Gothic Neo/SF. 독립비평ready/필수수정없음. 최종check 1~4passed, design-system awaiting_approval/canApprove true.
- 남은 일: 사람이 design-system 승인 후 Cursor MCP CLI채널b6q2ot0a로 Figma제작. 지정원본벡터126:706복제는 후속이며 로컬PNG로고는 미리보기전용. 실제Figma동일성/바인딩/원격캡처/인증 및 최신브랜드규정은 미검증. 사람approve/review대행과Figma쓰기없음. 재개는 control/flow.md.

## 2026-11-16 — Cursor MCP 로그인 Figma 부분 제작·도구 제한

- 실제 제작: Cursor MCP CLI채널b6q2ot0a만으로 기존Page1에 새루트156:1282(390x844)1개 추가. 지정원본벡터로고126:706을복제156:1285로스케일,소개·공식3버튼·약관배치. 실제캡처06-figma/captures/figma-default.png 직접확인. 링크https://www.figma.com/design/LynbxdW8Qf7TavCrPLd2nY/BugMap?node-id=156-1282 .
- 산출물: work/bugmap-login-kyro/06-figma/node-map.json·change-log.md·build-log.json·root-summary.json·capture-manifest.json·raw-export-status.json·critique.md·web/ 및실행스크립트. 다중실행선택용루트.design-harness.json설정.
- 검증: 기존36루트ID/이름/타입목록보존,원본로고전후조회동일해시. 캡처SHAf07a0b2f896dbdcc9dd67c3add3f154ab09bcc3001ae5b75256a396edebc2f9a. 새맥락비평needs_revision:지도누락중요/조판차이경미/raw전체조회불가차단. 최종check1~5passed/6in_progress(nodes.json누락).
- 미완료: 현Cursor플러그인에SVG/벡터경로·회전·폰트/조판설정·전체raw조회지원이없어승인지도와글꼴미구현,하단모서리차이남음. nodes.json추정작성/전체lint완료/사람승인대행/7단계이후진행없음.
- 사용자최신제약:공식Figma도구사용금지. 실제공식쓰기/읽기호출없음. 플러그인수정/설치도수행하지않음. 지원기능확보후기존루트만수리해야하며전체완료로기록하지않는다. 재개조건control/flow.md.

## 2026-11-16 — 로그인 디자인 산출물 커밋 대상 검증

- 커밋 범위: .design-harness.json, example/kyroFirstPage.png, work/bugmap-login-kyro/ 전체 산출물과 이 진행 기록. 사람의 기존 승인 기록은 변경 없이 포함한다.
- 검증: JSON33개 파싱 및 JavaScript스크립트6개 node --check 통과, git diff --check 통과. 새 하네스검사1~5passed/6in_progress(nodes.json누락),7~8blocked 확인.
- 남은 일: 지도·글꼴·전체원격구조검증 등6단계미완료사항 유지. 이번 커밋은 부분결과 보존이며 디자인완료나후속단계승인이 아니다.

## 2026-11-16 — 지도 중심 화면 색상 기준 정리

- Figma의 첫 로그인(134:1239), 메인 발견 지도(163:1319), 발견/채집 기록 작성(164:1431)에 사용한 공통 색을 `src/theme/tokens.ts`의 `mapFlowColors`와 `docs/DESIGN.md`에 추가했다. 화면별 Figma 링크와 색상 역할은 공통 디자인 문서에서 확인할 수 있다.
- 검증: 제작 시 사용한 색상 값과 기존 렌더링을 기준으로 정리했고 토큰 26개의 문서 일치, `npm run typecheck`, `git diff --check`를 확인했다. Figma 재조회는 시간 초과됐다. 앱 화면에 다크 토큰을 연결하는 작업은 후속 범위다.

## 2026-11-16 — Cursor MCP 로그인 전체 노드 내보내기

- Cursor MCP 서버와 로컬 Figma 플러그인에 읽기 전용 `get_node_tree`를 추가했다. 기존 로그인 프레임 156:1282의 노드 36개(벡터 16개)를 스캔 결과와 대조했고, 이미지 해시 2개를 확인했다. 파일 키는 기존 노드 매핑의 Figma URL과 대조했다.
- 산출물은 [nodes.json](../work/bugmap-login-kyro/06-figma/nodes.json)과 [Figma 검사 보고서](../work/bugmap-login-kyro/07-validation/figma-lint.json)다. 검사는 오토레이아웃 미적용 11건과 기본 항등 변환을 이미지 변경으로 보고한 2건을 기록했다. `check`는 1~5단계 통과, Figma 단계 진행 중이다.
- 기존 Figma 프레임은 조회만 했다. 오토레이아웃과 이미지 검사 규칙 확인은 후속 작업이다.

## 2026-11-19 — 메인 발견 지도 제품·디자인 기준 갱신

- [PRD](../docs/PRD.md)와 [DESIGN](../docs/DESIGN.md)에 Mapbox 로고·출처, 내 주변 반경, 확대 수준별 기록 표시, 개별 기록 상세 카드의 요구사항과 검수 기준을 추가했다. [TDD](../docs/TDD.md)에 지도 레이어 기반 구현을 남기고 [화면 명세](../docs/screens/main-map.md)에 07 시안의 적용 기준을 연결했다.
- 문서 내 요구사항과 공식 Mapbox 출처 지침을 대조했다. 네이티브 지도 연동과 Figma 시안 반영은 후속 작업이다.

## 2026-11-19 — BugMapHaness 05 로그인 하네스 준비

- [실행 PRD](../work/bugmap-login-map-harness/01-prd/PRD.md), 수용 기준 6개와 [재개 메모](../work/bugmap-login-map-harness/control/flow.md)를 준비했다. BugMap의 05 원본 390×844 PNG와 노드 조회를 보관했고, 대상 채널에 연결해 Page 1과 기존 지도 7:2를 확인했다.
- 원본 캡처를 열고 해시·치수 및 수용 기준을 대조했다. 독립 비평의 자산·레이어·버튼 검수 제안을 반영했다. 사용자가 공유한 링크의 파일 키와 페이지를 대상 설정에 고정했다. 하네스가 요구하는 PRD 사람 승인과 대상 전체 노드 검증 경로 확인이 남았다. Figma 제작은 시작하지 않았다.

## 2026-11-19 — BugMapHaness 05 로그인 리서치·구조·와이어프레임

- PRD 승인 `bc172c53-cf59-4d91-9d5e-66658726b19b`을 확인했다. [리서치](../work/bugmap-login-map-harness/02-research/findings.md)는 원본 PNG와 2026-11-12 제공자 공식 캡처 3장을 직접 대조하고, 2026-11-19 공식 본문과 승인 시안의 차이를 기록했다.
- [화면 구조](../work/bugmap-login-map-harness/03-structure/screens.csv)와 [기본형 390×844 와이어프레임](../work/bugmap-login-map-harness/04-wireframes/captures/login/default.png)을 작성했다. 로컬 Chromium 실행 권한으로 SVG·PNG를 생성했다. 경계선과 겹친 ‘한강’을 수정하고 재캡처했다. 버튼 크기 358×48px, 간격 12px, 한 화면·수용 조건 6개 연결 및 해시를 검증했다. 리서치와 구조·와이어프레임 독립 비평은 준비 완료로 판정했다.
- 다음 단계는 사용자 와이어프레임 승인 뒤 디자인 시스템이다. 원본과 대상의 Figma 편집 및 실제 제공자 로그인 연동은 진행하지 않았다. 재개 명령은 [진행 메모](../work/bugmap-login-map-harness/control/flow.md)에 있다.

## 2026-11-19 — BugMapHaness 05 로그인 디자인 시스템 시안

- 와이어프레임 승인 `c375b92c-4613-406e-89d7-9dbc42903756`을 확인했다. [디자인 명세](../work/bugmap-login-map-harness/05-design-system/DESIGN.md), [390×844 기본 시안](../work/bugmap-login-map-harness/05-design-system/captures/390x844-default.png), [자산·대조 결과](../work/bugmap-login-map-harness/05-design-system/review.md)를 준비했다. 원본 지도·페이드 합성 PNG, 무배경 #C5EE79 SVG, 358×48px·간격 12px·모서리 설정 32px 소셜 버튼을 적용했다.
- 로컬 Chromium 캡처를 직접 확인했다. Apple 버튼 이미지의 외곽 마스킹을 수정하고 경계와 한강 라벨을 밝게 보정했다. 최종 기하 9건·대비 13건, 등록 PNG 3개 해시 검증, 독립 비평을 마쳤다.
- 디자인 시스템 사람 승인 뒤 BugMapHaness에서 편집한다. 대상 파일에 실제 프레임은 아직 추가하지 않았으며 전체 노드 내보내기와 원격 레이어·시각 비교가 남았다.

## 2026-11-19 — BugMapHaness 05 데스크톱 CLI 제작 준비

- 디자인 시스템 승인 `ae7e9258-e0ef-465b-a759-45c6bef54c98`를 확인했다. CLI로 채널 y5fz18ft의 BugMapHaness Page 1과 기존 02 노드 7:2를 조회했다. 실행 중인 플러그인의 SVG 가져오기 및 전체 트리 미지원을 확인했다.
- 기존 로컬 개발용 Cursor MCP Plugin에 대상·승인 시안 전용 제작 명령을 추가했다. [CLI 경로](../work/bugmap-login-map-harness/06-figma/cli/README.md), [읽기 확인](../work/bugmap-login-map-harness/06-figma/cli-preflight.json), [검증용 HTML](../work/bugmap-login-map-harness/06-figma/web/login.html)을 저장했다. 플러그인 원본 백업 및 구문 검사, 모의 대상 보호·실패 복구·중복 방지 검사를 수행했다.
- 대상 플러그인 재실행과 새 채널 연결을 기다린다. 이 시점에는 Figma 프레임 제작이나 원격 캡처, Figma 검사, HTML 실렌더를 수행하지 않았다. 브라우저로 화면을 그리지 않았다.

## 2026-11-19 — 전용 데스크톱 CLI 연결 준비

- 재실행 채널 `8wmnqe92`에서 BugMapHaness Page 1과 기존 지도 `7:2`를 다시 확인했다. 새 제작 확인 명령과 전체 트리 명령이 둘 다 Unknown으로 응답해 이전 플러그인 명령이 로드됐음을 확인했다.
- 로컬 전용 개발 플러그인 [매니페스트](/Users/mac/Documents/ChatGPT/BugMap/bugmap05-figma-cli/manifest.json)를 준비했다. 새 이름은 BugMap 05 CLI이며 포트 3055의 `k7v4m3p9`만 사용한다. 모의 UI 요청·응답, 코드 구문을 검증했다. Figma 원격 제작과 캡처는 전용 플러그인의 실행을 기다린다.

## 2026-11-19 — BugMapHaness 05 로그인 CLI 제작 및 검수

- 사용자가 새로 제공한 채널 `o5pf3rim`의 기존 개발용 Cursor MCP Plugin에서 제작 명령이 동작했다. Figma 데스크톱에 390×844 [로그인 19:2](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHaness?node-id=19-2) 한 장을 CLI로 제작했다. 별도 개발 플러그인은 쓰지 않았다.
- 최종 [원격 PNG](../work/bugmap-login-map-harness/06-figma/captures/login-default.png)에서 지도·페이드와 소셜 자산, 벡터 로고를 직접 검수했다. SVG 치수와 소개 오토레이아웃을 보정했다. Figma 검사 74개 노드 및 HTML 검수 이슈 0건이며 HTML과 승인 PNG 비교 변경 픽셀 0건이다.
- 대상 기존 `7:2`는 PRD·제작 직전·최종 해시가 같다. 원본 파일에 쓰지 않았고 원본 제작 후 재조회는 타임아웃으로 남았다. [원격 보존 기록](../work/bugmap-login-map-harness/06-figma/preservation.json) · [검증 결과](../work/bugmap-login-map-harness/07-validation/report.md)

## 2026-11-19 — BugMap 원본 05 보존 대조 완료

- 새 채널 `q1ph8ega`의 원본 BugMap 05를 CLI로 읽었다. 제작 전후 `get_node_info` 해시, 레이어 102개의 ID·유형, 390×844 PNG 전체 바이트가 일치했다. 해당 채널의 `get_node_tree` 미지원은 [원본 비교 근거](../work/bugmap-login-map-harness/06-figma/preservation/source-compatible-report.json)에 남겼다.
- [검증 보고서](../work/bugmap-login-map-harness/07-validation/report.md), 수용 조건 6개, 독립 비평을 갱신했다. 대상 지도 7:2 보존 근거와 Figma·HTML 자동 검사 결과를 유지했다. 최종 검수 점수와 승인은 사람이 기록해야 한다.

## 2026-11-19 — BugMapHaness 첫 로그인 핸드오프 준비

- 검증 승인 `835f3541-c6fd-429d-b509-5e72826e3a93`을 확인하고 [핸드오프](../work/bugmap-login-map-harness/08-handoff/HANDOFF.md), 개발 메모, 전달 자산 7개, 미결 항목과 매니페스트를 만들었다.
- Figma 캡처를 직접 확인했다. 요구사항 6개, 자산의 원본 바이트, 매니페스트 해시와 상대 링크를 대조했다. 독립 비평의 제안에 따라 약관 노드 및 컴포넌트 이름을 추가했다. 핸드오프 수락은 사람이 기록한다.

## 2026-11-19 — BugMapHaness 첫 로그인 디자인 하네스 완료

- 최종 핸드오프 승인 `949fe250-4b1a-40fe-a4f3-e6bed0268854`를 확인했다. 하네스의 실제 검사에서 8단계 모두 `passed`, `complete: true`였다.
- [Figma 19:2](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHaness?node-id=19-2), [핸드오프](../work/bugmap-login-map-harness/08-handoff/HANDOFF.md), [검증 보고서](../work/bugmap-login-map-harness/07-validation/report.md)를 연결했다. 제품 인증과 실기기 검증은 [미결 항목](../work/bugmap-login-map-harness/08-handoff/open-items.md)을 따른다.

## 2026-11-19 — BugMapHaness 로그인 후 메인 지도 와이어프레임 준비

- PRD 승인을 확인하고 [리서치](../work/bugmap-main-map-harness/02-research/sources.md), [화면 흐름](../work/bugmap-main-map-harness/03-structure/flows.mmd), [접힌 기본 시안 390×844](../work/bugmap-main-map-harness/04-wireframes/captures/main-map/default.png)을 준비했다. 지도 위 GPS와 기록, 패널의 곤충·지역 검색과 네 탭, 드래그 손잡이, Mapbox 출처 위치를 잡았다.
- Kyro, BugMap 02, Mapbox 문서의 실제 캡처와 생성된 와이어프레임을 직접 확인했다. 배치 검수, 최소 44×44px 터치 영역과 안전 영역, 요구사항 8개 대조 및 하네스 검사를 기록했다. [검수 기록](../work/bugmap-main-map-harness/04-wireframes/review.md)
- 다음 단계는 사람의 와이어프레임 승인이다. [재개 지점](../work/bugmap-main-map-harness/control/flow.md)에서 승인 명령을 확인할 수 있다. 이후 디자인 시스템과 Figma 제작을 진행하며 확장 화면은 후속 범위다.

## 2026-11-19 — 메인 지도 묶음 마커를 총 건수로 표시

- 사용자 피드백을 반영해 가까운 관찰·채집 기록을 `기록 N` 한 배지로 표시했다. 와이어프레임 예시는 `기록 7`, `기록 3`, `기록 5`다. 너비를 84px에서 64px로 줄이고 높이 44px를 유지했다. 개별 기록 상세에 유형을 표시하도록 [화면 명세](../docs/screens/main-map.md)와 [지도 흐름](../work/bugmap-main-map-harness/03-structure/flows.mmd)을 갱신했다.
- [수정 PNG](../work/bugmap-main-map-harness/04-wireframes/captures/main-map/default.png)를 직접 열어 세 배지의 문구와 배치를 확인했다. 하네스가 만든 SVG·PNG 해시와 좌표를 대조했다. 다음 단계는 업데이트된 와이어프레임 승인이다. 실제 지도 확대와 기록 상세 동작은 구현 검증 범위다.

## 2026-11-19 — BugMapHaness 메인 지도 다크 시안 준비

- 와이어프레임 승인 `100b8aa6-78a7-4719-abd7-ca0e844900ee`를 확인했다. [390×844 대표 시안](../work/bugmap-main-map-harness/05-design-system/captures/390x844-default.png)에 BugMap 다크 팔레트와 Pretendard, 시연용 지도, 공식 Mapbox 로고를 적용했다. ‘기록 N’ 배지와 GPS·발견/채집 기록 버튼, 검색창 및 네 탭의 배치를 검수했다.
- 대표 화면을 실제 Chromium으로 렌더링하고 직접 열었다. 13개 배치·문구 검사와 21개 대비 검사 통과, 텍스트 최저 5.01:1, 손잡이 6.46:1, 12개 터치 영역 최소 44×44px를 확인했다. [디자인 시스템](../work/bugmap-main-map-harness/05-design-system/DESIGN.md) · [검수 기록](../work/bugmap-main-map-harness/05-design-system/review.md)
- 다음 단계는 사람의 디자인 시스템 승인이다. Figma 편집 가능 레이어와 기존 노드 보존, 실제 기기의 지도·검색·드래그·GPS 동작은 후속 검증 대상이다. [재개 지점](../work/bugmap-main-map-harness/control/flow.md)

## 2026-11-19 — BugMapHarness 메인 지도 Figma 제작

- 디자인 시스템 승인 `b95f6ebe-352d-4004-9602-93da1a83250f`로 Cursor MCP에서 [메인 · 발견 지도 41:81](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81)을 제작했다. 기록 묶음 컴포넌트 인스턴스 3개, 하단 패널 및 탭, 검색, GPS·기록, 지도 벡터를 구성했다. Figma에서 가용한 한국어 글꼴 Noto Sans KR을 적용했다.
- 지도·아이콘 SVG 기하를 보정해 [390×844 실제 Figma 캡처](../work/bugmap-main-map-harness/06-figma/captures/main-map-default.png)를 직접 확인했다. 기존 `7:2`·`19:2`는 원격 트리와 PNG 해시로 보존을 확인했다. 임시 제작 명령을 사용한 뒤 기존 Cursor MCP Plugin 소스를 복원했다. [변경·검수 기록](../work/bugmap-main-map-harness/06-figma/change-log.md)
- Figma 자동 검사는 공식 Mapbox 벡터의 검정·흰색에만 10개 이슈를 기록했다. 검증용 HTML의 Chromium 실행은 이슈 0개였다. 하네스 Figma 단계는 공식 자산 색상 처리에 대한 결정을 기다린다. [재개 지점](../work/bugmap-main-map-harness/control/flow.md)

## 2026-11-20 — BugMapHarness 메인 지도 자동 검수 완료

- 승인된 공식 Mapbox SVG와 기존 Figma 프레임을 유지하면서 하네스에 자산 해시, 원격 벡터 경로·구조, 불투명도와 흑백 페인트 검사를 추가했다. 검사 범위는 등록된 로고 하위 레이어다. 기존 UI 토큰 규칙과 PNG 자산 검사를 회귀 테스트로 확인했다.
- [Figma 검사](../work/bugmap-main-map-harness/07-validation/figma-lint.json)는 410개 노드와 공식 로고 페인트 12개를 검사해 이슈 0건이었다. [웹 검사](../work/bugmap-main-map-harness/07-validation/web-lint.json)는 승인 시안과 390×844 Chromium 캡처의 임계값 초과 변경 픽셀 0개, 이슈 0건이었다. 전체 하네스 테스트 44개 통과.
- 저장한 실제 Figma 캡처와 노드에서 요구사항 8개를 대조했다. 새 원격 내보내기는 연결 문제로 수행하지 못했다. 사람의 최종 검수 기록과 승인이 남아 있다. [최종 검수 보고서](../work/bugmap-main-map-harness/07-validation/report.md) · [재개 지점](../work/bugmap-main-map-harness/control/flow.md)

## 2026-11-20 — BugMapHarness 메인 지도 개발 인계 준비

- 최종 검수 승인 `822647ec-23c4-4aa6-855c-6fb6a37f8406`을 확인했다. [개발 인계서](../work/bugmap-main-map-harness/08-handoff/HANDOFF.md)에 Figma 41:81, HOME-01~08, 구현 메모, 공개 위치와 기록 묶음 흐름, 후속 검증 항목을 연결했다.
- [무결성 매니페스트](../work/bugmap-main-map-harness/08-handoff/manifest.json)의 입력 87개와 출력 1개의 해시, 승인 자산 6개의 원본 바이트, 문서 상대 링크를 대조했다. 공식 Mapbox 로고는 원본 해시와 일치한다.
- 하네스 검사에서 1~7단계 통과를 확인했다. 사람의 최종 인계 수락을 기다린다. [재개 지점](../work/bugmap-main-map-harness/control/flow.md)

## 2026-11-20 — BugMapHarness 메인 지도 디자인 하네스 완료

- 최종 인계 승인 `c3ec40ce-51cd-4157-9011-71f967a0c77c`의 유효성을 확인했다. 실제 하네스 검사에서 8단계 모두 `passed`, `complete: true`였다.
- [Figma 메인 지도 41:81](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81), [최종 개발 인계서](../work/bugmap-main-map-harness/08-handoff/HANDOFF.md), [검수 보고서](../work/bugmap-main-map-harness/07-validation/report.md)를 최종 산출물로 연결했다. [확장 패널과 실제 앱 동작의 후속 범위](../work/bugmap-main-map-harness/08-handoff/open-items.md)를 확인할 수 있다.

## 2026-11-20 — BugMapHarness 내 주변 발견 와이어프레임 준비

- PRD 승인 `9e02aa07-23ee-4e87-8530-39e1f406f67b`을 확인했다. [리서치](../work/bugmap-nearby-discoveries-harness/02-research/sources.md)와 [구조 및 상태 전환](../work/bugmap-nearby-discoveries-harness/03-structure/flows.mmd)을 작성했다. 메인 지도 손잡이에서 확장 패널로 진입하고 ‘지도 보기’로 복귀하는 흐름을 명시했다.
- [전체](../work/bugmap-nearby-discoveries-harness/04-wireframes/captures/nearby-discoveries/default.png)와 [3 km 이내](../work/bugmap-nearby-discoveries-harness/04-wireframes/captures/nearby-discoveries/radius-3km.png) 두 상태를 390×844로 렌더해 확인했다. 검색, 거리 선택, 사진 자리표시자가 있는 공개 기록과 고정 지도 복귀 및 네 탭을 배치했다. [와이어프레임 검수](../work/bugmap-nearby-discoveries-harness/04-wireframes/review.md)
- 사람의 와이어프레임 승인을 기다린다. 사진 자산과 다크 시안은 디자인 시스템 단계, 실제 Figma 연결은 제작 단계에서 진행한다. [재개 지점](../work/bugmap-nearby-discoveries-harness/control/flow.md)

## 2026-11-20 — BugMapHarness 내 주변 발견 다크 시안 준비

- 와이어프레임 승인 `c5706296-4038-4a31-ab68-b0b922a9f66f`를 확인했다. 기존 지도와 같은 검색·선택된 지도 탭을 이어받아 [전체 시안](../work/bugmap-nearby-discoveries-harness/05-design-system/captures/390x844-default.png)과 [3 km 이내 시안](../work/bugmap-nearby-discoveries-harness/05-design-system/captures/390x844-radius-3km.png)을 만들었다. 예시 기록에 정사각형으로 잘라낸 곤충 사진을 사용했다. [사진 출처와 라이선스](../work/bugmap-nearby-discoveries-harness/05-design-system/asset-sources.md)
- 두 390×844 Chromium 캡처에서 검색, 거리 선택, 사진이 포함된 기록 목록 및 고정 지도 복귀를 확인했다. 3.0 km 기록을 포함하고 4.6 km 기록을 제외해 3개에서 2개로 좁혀지는 것을 확인했다. [검수 기록](../work/bugmap-nearby-discoveries-harness/05-design-system/review.md) · [독립 비평](../work/bugmap-nearby-discoveries-harness/05-design-system/critique.md)
- 사람의 디자인 시스템 승인이 남았다. 이후 Figma 상태와 메인 지도 연결을 제작한다. [재개 지점](../work/bugmap-nearby-discoveries-harness/control/flow.md)

## 2026-11-20 — BugMapHarness 내 주변 발견 Figma 제작과 검수

- 디자인 시스템 승인 `0d9f3d9e-b894-4fb0-bec1-725024d4c9b0` 뒤 [전체 50:1081](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=50-1081)와 [3 km 이내 50:1190](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=50-1190)를 Cursor MCP에서 제작했다. Figma에서 기존 지도와 같은 Noto Sans KR을 사용했다. 두 실제 PNG와 연결을 재조회했다. [제작 기록](../work/bugmap-nearby-discoveries-harness/06-figma/change-log.md)
- 실제 Figma 플레이어에서 기존 지도 손잡이 드래그 진입, 거리 선택과 돌아오기, 양쪽 지도 보기를 확인했다. 3.0 km 경계 기록이 포함된다. 기존 지도·Mapbox 로고·로그인 등의 프레임 PNG는 전후 일치했고, 메인 지도 트리는 드래그 연결만 달라졌다. 임시 Cursor 소스 두 파일은 원본으로 복원했다. [보존](../work/bugmap-nearby-discoveries-harness/06-figma/preservation.json) · [검수](../work/bugmap-nearby-discoveries-harness/07-validation/report.md)
- PNG 검사에서 Figma FIT/FILL의 기본 항등행렬을 허용하고 실제 변형·크롭은 거부하도록 보완했다. Figma 205개 노드 이슈 0, Chromium 두 화면 각 승인 PNG 대비 변경 픽셀 0, 하네스 테스트 44개 통과. 사람의 최종 리뷰와 승인이 남았다. [재개 지점](../work/bugmap-nearby-discoveries-harness/control/flow.md)

## 2026-11-20 — BugMapHarness 내 주변 발견 개발 인계 준비

- 최종 검수 리뷰와 승인 `e8e6681f-5942-4dab-b63d-eda663c277d6`을 확인했다. [개발 인계서](../work/bugmap-nearby-discoveries-harness/08-handoff/HANDOFF.md)에 두 390×844 Figma 상태, NEAR-01~06, 반경·공개 위치·검색 상태 공유 기준, 사진 3종과 라이선스, 실기기 확인 항목을 연결했다.
- [무결성 매니페스트](../work/bugmap-nearby-discoveries-harness/08-handoff/manifest.json)의 입력 107개와 출력 1개, 원본과 같은 사진 바이트, 네이티브 PNG 2개, 노드 및 상대 링크를 검증했다. [독립 비평](../work/bugmap-nearby-discoveries-harness/08-handoff/critique.md)
- 하네스에서 1~7단계 통과를 확인했다. 사람의 인계 수락이 남았다. [재개 지점](../work/bugmap-nearby-discoveries-harness/control/flow.md)

## 2026-11-20 — BugMapHarness 내 주변 발견 디자인 하네스 완료

- 개발 인계 수락 `a904e16e-f6e5-4839-947a-5b49ad600bd1`의 유효성을 확인했다. 하네스에서 8단계 모두 `passed`, `complete: true`였다.
- [최종 개발 인계서](../work/bugmap-nearby-discoveries-harness/08-handoff/HANDOFF.md), [기존 지도에서 시작하는 Figma 프로토타입](https://www.figma.com/proto/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81&scaling=scale-down), [검수 보고서](../work/bugmap-nearby-discoveries-harness/07-validation/report.md)를 연결했다. 실제 제품 동작의 [실기기 확인 항목](../work/bugmap-nearby-discoveries-harness/08-handoff/open-items.md)을 인계서에 남겼다.
