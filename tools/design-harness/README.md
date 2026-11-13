# design-harness

Node 20+ ESM CLI. 외부 npm 런타임 의존성 없이 단계별 파일·해시·캡처·웹 규칙·사람 리뷰를 검사한다. [전체 설계](https://github.com/jungjeongml/BugMap/blob/main/docs/design-harness.md)를 따른다. 앱의 Node 22.13+ 요구사항과는 별개다.

```sh
# 저장소 루트에서 설치 없이
npm run design-harness -- check --project bugmap
npm run design-harness -- refs:capture --project bugmap
npm run design-harness -- wireframe --project bugmap
npm run design-harness -- design-md --project bugmap
npm run design-harness -- lint:web --project bugmap
npm run design-harness -- review validation --by "홍길동" --score 4 --notes "화면·대비·흐름 검토" --project bugmap
npm run design-harness -- approve validation --by "홍길동" --project bugmap
npm run design-harness -- handoff --project bugmap
npm test

# 독립 명령으로 사용
export PATH="$PWD/tools/design-harness/bin:$PATH"
design-harness check --project bugmap --json
```

`--root`는 현재 디렉터리, `--project`는 `bugmap`이 기본값이다. 모든 산출물은 `<root>/work/<project>/`에 둔다. 프로젝트 ID는 영문·숫자로 시작하고 영문·숫자·`_`·`-`만 허용한다. 단계는 번호 1~8 또는 `prd`, `research`, `structure`, `wireframes`, `design-system`, `figma`, `validation`, `handoff`다. 승인 필수 단계는 1·4·5·7·8이다.

생성 명령은 기존 파일을 덮어쓰지 않는다. 재생성은 `--force`를 명시한다. **재생성·리뷰 추가는 기존 승인을 무효화할 수 있다.** 생성 전에 출력 경로를 확인하고 심볼릭 링크·프로젝트 밖 경로를 거부한다. 루트 `docs/DESIGN.md`와 사용자 앱 코드는 변경하지 않는다.

`refs:capture`, `wireframe`, `lint:web`는 설치된 Chrome/Chromium이 필요하다. macOS의 Google Chrome/Chromium, Linux의 통상 설치 경로를 찾고, 다른 위치는 `--browser /absolute/path/to/chromium`으로 지정한다. 사용자 로그인 프로필과 별개의 임시 headless 프로필을 사용하며 종료 시 제거한다. Chromium CDP pipe를 Node 기본 모듈로 제어하므로 npm 브라우저 패키지를 설치하지 않는다. 이 구현의 지원 플랫폼은 macOS·Linux다.

## Figma 안전장치와 플러그인

[설치 두 명령·훅·노드 내보내기·lint:figma 계약](FIGMA.md)을 따른다. 소스 CLI와 설치 플러그인은 같은 구현이다. 실제 Figma 연결이나 사람 승인을 대신하지 않는다.

## 공통 입력과 단계 판정

공통 파일은 `README.md`, `control/project.json`, `control/decisions.md`다. `control/figma.json`이 있으면 공통 승인 입력에 포함하고 Figma 단계부터는 필수로 검사한다. `project.json` 예:

```json
{
  "id": "bugmap",
  "viewports": [{ "width": 390, "height": 844 }, { "width": 1024, "height": 768 }],
  "reviewMinScore": 4
}
```

viewport는 44~4096의 정수이며 기본은 390×844다. 리뷰 최소 점수 기본값은 4/5이고 `reviewMinScore`(0~5)로 조정한다. 나머지 메타데이터는 현재 전체 스키마 검사를 하지 않는다.

`check`는 읽기 전용이다. 파일 존재·빈 파일·JSON 구문과 아래 생성 증거·리뷰를 검사한다. 첫 미통과 단계가 `currentStage`이며 후속 단계는 `blocked`다. 누락/검사 실패는 `in_progress`, 승인 필요는 `awaiting_approval`, 기존 승인 해시 불일치는 `needs_revision`, 통과는 `passed`다. 점수·검사 실패를 `approve`로 덮을 수 없다.

`--json`은 `currentStage`, `complete`, `scope`, `stages`를 반환한다. 각 단계에는 ID·번호·상태·issues·canApprove·현재까지 파일 해시·선행 승인 ID가 담긴다. 생성 명령과 `review`도 `--json`을 지원한다. 종료 코드 0은 성공/전체 통과, 1은 미통과 단계 또는 lint 위반, 2는 입력·파일·브라우저 실행 오류다. 오류는 stderr에 출력한다.

## refs:capture

`02-research/refs.json`:

```json
{
  "references": [
    { "id": "discovery", "url": "https://example.com/", "viewport": { "width": 390, "height": 844 } }
  ]
}
```

ID는 프로젝트 ID와 같은 문자 규칙이며 대소문자를 무시한 중복은 거부한다. HTTP(S) URL만 허용하고 URL 안의 인증 정보는 거부한다. 페이지 로드·폰트 준비·두 렌더 프레임 후 viewport PNG를 `02-research/captures/<id>.png`에 저장한다. `captures.json`에 원본·최종 URL·제목·viewport·시각과 입력/출력 SHA-256을 기록한다. `check`는 레퍼런스 전체의 커버리지·해시·PNG 서명/치수를 확인한다. 원격 사이트가 나중에 바뀌었는지는 자동 감지하지 않으므로 필요 시 재캡처한다. 리서치 출처·분석·추천 문서는 별도로 작성한다.

## wireframe

`04-wireframes/wireframes.json`:

```json
{
  "screens": [{
    "id": "map", "state": "default", "title": "발견 지도", "width": 390, "height": 844,
    "blocks": [
      { "type": "text", "x": 16, "y": 24, "width": 358, "height": 40, "text": "발견 지도" },
      { "type": "image", "x": 16, "y": 80, "width": 358, "height": 560, "text": "지도 영역" },
      { "type": "button", "x": 214, "y": 720, "width": 160, "height": 48, "text": "발견 기록하기" }
    ]
  }]
}
```

블록 종류는 text·button·input·image·box다. 화면 밖 좌표·유효하지 않은 크기·44px 미만 버튼·중복 화면/상태를 거부한다. SVG 텍스트를 이스케이프한다. `04-wireframes/<id>/<state>.svg`와 `captures/<id>/<state>.png`, `wireframes-report.json`을 생성한다. 실제 지도나 사진 대신 저충실도 자리표시자를 그린다. `check`는 JSON에서 생성해야 할 모든 SVG/PNG 및 현재 해시를 확인한다. 화면 구조 CSV와의 전체 상태 대응 검증·자동 레이아웃은 후속 범위다.

## design-md

`05-design-system/`에 다음 세 파일을 작성한다.

```json
// tokens.json — 실제 파일에서는 주석 제거
{
  "colors": { "primary": "#15803d", "text": "#111827", "surface": "#ffffff" },
  "fontSizes": { "body": 14, "heading": 20 }
}
```

```json
// components.json
{
  "button": {
    "description": "기록 저장 버튼",
    "tokens": ["colors.primary", "fontSizes.body"],
    "states": ["default", "disabled"]
  }
}
```

```json
// copy.json
{
  "strings": { "save": "기록 저장" },
  "forbidden": ["정확도 98%", "무조건 성공"]
}
```

색상은 hex 3·4·6·8자리다. 글자 크기는 숫자(px) 또는 `14px` 형태의 양수이며 `typography.body.fontSize` 형식도 지원한다. 컴포넌트의 토큰 참조는 정의된 색/글자 크기 토큰이어야 한다. 금지 문구가 승인 문구에 들어가면 생성하지 않는다. Unicode NFKC·공백 정리·대소문자 정규화 후 비교한다.

`DESIGN.md`에 색·서체·컴포넌트 상태·문구·금지 문구·44px 기준과 원본 JSON 전체를 담고 `design-md.json`에 입력/출력 해시를 기록한다. `check`는 JSON 계약, 문서 재생성 일치, 해시를 검사한다. 원래 명세의 `icons.csv`, `preview.svg`, `captures/`는 별도로 준비해야 한다.

## lint:web

화면은 `06-figma/web/` 아래 `.html`과 로컬 CSS/JS/이미지/폰트로 둔다. CLI가 이 폴더만 읽는 임시 localhost 서버를 열고 HTML 전체를 설정 viewport마다 검사한다.

- 계산된 글자·배경·테두리·외곽선·그림자·그라디언트·인라인 SVG fill/stroke의 색이 토큰 팔레트 밖인지 검사한다. 완전 투명은 허용하고 이미지 픽셀 색은 검사하지 않는다.
- 실제 텍스트·입력 컨트롤·가상 요소의 계산된 font-size를 px 토큰과 비교한다.
- 보이는 button·role=button·input button/submit/reset의 `getBoundingClientRect()` 가로와 세로가 각각 44px 이상인지 검사한다. disabled 버튼에도 적용한다.
- 보이는 본문·aria-label·title·alt·placeholder·입력값·가상 요소에서 금지 문구를 찾는다. HTML 엔티티와 여러 태그에 나뉜 문구도 브라우저의 텍스트로 검사한다.
- 열린 shadow DOM은 순회한다. 보이는 iframe은 미지원 이슈로 실패한다. 외부 리소스는 해시로 추적할 수 없어 실패하며, 로컬 리소스 HTTP 오류도 실패한다.
- **레이아웃 규칙**은 실제 텍스트 위치(Range)로 검사한다. `text-clipped`는 `overflow: hidden/clip` 조상 밖으로 나간 글자, `overlap`은 서로 포함 관계가 아닌 글자·이미지·SVG·입력 요소와 겹친 글자, `offscreen`은 viewport 가로 밖으로 나간 글자다. `contrast`는 글자색과 실제 배경(반투명 배경을 합성)의 WCAG 대비가 4.5:1(24px 이상 또는 18.66px 이상 굵은 글자는 3:1) 미만인 경우다. 비활성 컨트롤과 배경 이미지·그라디언트 위 글자는 대비 계산에서 제외하고 시각 비교에 맡긴다.
- **승인 캡처 비교**(`visual-diff`)는 각 캡처를 승인된 디자인 시스템 캡처 `05-design-system/captures/<가로>x<세로>-<상태>.png`와 픽셀 단위로 비교한다. 상태는 HTML 이름의 `--` 뒤(`login--network_error.html` → `network_error`)이며 없으면 `default`다. 채널 차이가 `visualChannelDelta`(기본 16)를 넘는 픽셀 비율이 `visualMaxDiffRatio`(기본 0.0005 = 0.05%)를 넘으면 실패하고 변경 비율과 변경 영역 좌표를 보고한다. 둘 다 `control/project.json`에서 조정한다. 승인 캡처가 없으면 비교를 건너뛰지 않고 `visual-baseline-missing`으로 실패한다. 승인 캡처는 lint 입력 해시에 포함되므로 바뀌면 이전 결과가 무효가 된다.
- 토큰 규칙은 "허용된 값인가"만 본다. 허용된 색·크기만으로 숨김·순서 변경·자산 교체·잘림·겹침·저대비를 만들 수 있으므로 레이아웃 규칙과 승인 캡처 비교가 함께 필요하다. 다른 OS·글꼴 환경에서 기준 캡처를 만들면 글리프 차이가 생길 수 있으니 같은 환경에서 기준과 검사를 실행하거나 허용치를 근거와 함께 조정한다.

`07-validation/web-lint.json`과 `captures/<화면경로해시>-<가로>x<세로>.png`를 저장한다. 위반이 있으면 보고서를 남기고 종료 코드 1을 반환한다. 파일별 selector·규칙·값·viewport를 보고한다. `check`는 현재 HTML/CSS/JS/자산 전체·세 JSON·project.json의 해시와 보고서 커버리지·위반 0개·캡처 해시/치수를 확인한다. CSS만 수정해도 이전 결과는 무효다.

이 검사는 로드 후 상태의 스냅샷이다. 클릭 후 상태·키보드 흐름·애니메이션 전체·닫힌 shadow DOM·캔버스/이미지 내부·네이티브·실제 Figma·요구사항 커버리지는 별도 검증해야 한다. 테스트 통과를 제품 전체 품질 보증으로 취급하지 않는다.

## review와 approve

```sh
design-harness review validation --by "수진" --score 4 --notes "대비·오류 안내·모바일 조작 확인"
design-harness approve validation --by "수진"
```

`review`는 단계 폴더 `reviews.json`에 UUID·승인자 기입 이름·UTC 시각·0~5 점수·필수 메모·현재 단계까지 파일 SHA-256을 추가한다. 자기 reviews.json만 스냅샷에서 제외해 순환 해시를 피한다. 모든 단계에 리뷰를 남길 수 있고, validation에서는 **최신 리뷰**가 현재 입력과 일치하며 최소 점수를 넘어야 통과한다. 리뷰 전후에 파일이 바뀌면 다시 리뷰해야 한다. 낮은 점수도 기록하되 검사에서 실패한다. 리뷰는 승인을 자동 생성하지 않는다.

`approve`는 앞 단계 통과와 현재 단계 검사 성공을 확인한다. `control/approvals.json` 형식은 `{ "version": 1, "approvals": [] }`이며 이력에 id·stage·by·at·files·upstreamApprovals를 추가한다. files는 공통 입력(대상 Figma 설정 포함)과 현재 단계까지 폴더 전체를 포함해 선택 파일의 추가/수정/삭제도 감지한다. 단계별 마지막 승인만 비교한다. 선행 재승인은 새 UUID를 만들므로 하위 승인이 무효화된다. 파일과 선행 승인 ID를 정확히 예전 상태로 복원하면 내용 기반 승인이 다시 일치할 수 있다.

승인·리뷰 해시 비교에서 줄바꿈(CRLF/LF)만 다른 UTF-8 텍스트는 같은 내용으로 본다. Git 체크아웃 설정에 따라 줄바꿈이 바뀌어도 새로 받은 저장소에서 승인이 무효가 되지 않게 하기 위해서다. 글자 하나라도 바뀌면 여전히 무효다. 바이너리 파일은 바이트 그대로 비교한다.

손상된 리뷰·승인 이력은 초기화하거나 덮어쓰지 않는다. 승인/리뷰 각각 배타적 잠금과 임시 파일 rename으로 저장한다. 강제 종료 후 잠금이 남으면 실행 프로세스가 없음을 확인한 뒤 `control/.approvals.lock` 또는 `.reviews-<단계>.lock`을 제거한다. 생성 도구와 편집기는 이 잠금에 참여하지 않으므로 승인·리뷰·생성 중 파일 편집을 멈춘다. --by는 인증이 아닌 자기 기입 이름이며 로컬 보고서도 전자서명은 아니다.

## handoff

1~7단계 검사 및 필수 승인 후 실행한다. `08-handoff/implementation-notes.md`, `open-items.md`, `assets/`는 먼저 작성한다. 명령은 승인 UUID·실제 구현 메모·미해결 사항·소스 상대 링크를 담은 `HANDOFF.md`, 입력/출력 해시·승인 ID의 `manifest.json`을 만든다. 상태를 숨기는 빈 완료 문서를 만들지 않는다. 후속 입력·메모·승인 변경 시 다시 생성해야 하며, 최종 handoff 승인은 별도로 필요하다. 제품 코드 작성·배포·외부 공유는 수행하지 않는다.

## 테스트와 캡처 비교

`npm test`는 CLI/계약/승인 회귀 테스트와 Chromium 통합 테스트를 실행한다. 플러그인 설치 테스트에는 Codex CLI가 필요하며 임시 설정 디렉터리만 사용한다. Chromium이 없으면 브라우저 테스트만 skip하며, `DESIGN_HARNESS_BROWSER`로 실행 파일을 지정할 수 있다. localhost 서버 및 headless 프로세스 실행 권한이 필요하다. 브라우저 테스트는 시스템 temp의 `bugmap-design-harness-qa/`에 시각 검토용 캡처를 남긴다.

사용자 요청으로 [Playwright 비교 스크립트](qa/README.md)를 별도 제공한다. 검증용 Playwright/pngjs는 임시 설치할 수 있고 CLI 런타임 의존성에 포함하지 않는다. 비교 결과는 실제 차이 픽셀 수·비율과 expected/actual/diff PNG로 남긴다. 서로 다른 렌더링 경로의 작은 글리프 차이도 숨기지 않고 보고한다.
