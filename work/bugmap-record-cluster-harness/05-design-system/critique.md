# 기록 묶음 디자인 시스템 독립 비평

## 첫 검토

### 5단계 디자인 시스템 비평

**판정 `needs_revision`**. 두 정적 시안은 시각 수용 기준을 충족한다. 컴포넌트의 상태 표현과 공통 디자인 기준의 적용 범위를 문서에 보완하면 된다.

#### 검토 근거

승인된 PRD·수용 기준·상태와 흐름·`docs/DESIGN.md`를 대조했다. `wireframes.json`의 SHA-256은 `899b024b7b56c7fc93e1c72d8760d4b464890fce36ed499b4becc0daf6f853a6`이다. 후보의 `tokens.json`, `components.json`, `copy.json`, 생성 `DESIGN.md`, 두 SVG와 `icons.csv`를 읽었다. 네 문서 해시는 전달받은 값과 일치하며 디자인 시스템 계약 검사 결과는 `[]`였다.

다음 두 390×844 PNG를 이미지 도구에서 직접 열어 확인했다.

- `390x844-cluster-selected.png` · `4c8d9e079a8481ccaefc9287c9624facbdaa2b0cb5d9067bc05f08cab12e1a55`
- `390x844-cluster-selected-overflow.png` · `f49b61a9f644983906c7881606f608ee49b03064504a57d65fcddda9a8f176b3`

#### 발견

- **중요 · 컴포넌트 상태.** 닫기·기록 행·마커·출처 버튼의 `focus-visible`과 닫기·행의 `pressed`는 상태 이름만 정의돼 있다. 후속 구현에서 초점이 선택 강조와 구별되고 목록 경계에서도 보이도록 각 상태의 표시와 적용 토큰을 `components.json`에 정의하고 `DESIGN.md`를 재생성한다.
- **경미 · 기존 시스템 적용 범위.** 공통 기준의 카드·미디어 곡률과 달리 목록 행은 16px, 썸네일은 12px다. 승인된 와이어프레임의 18px 이름에 Pretendard Bold를 적용했다는 점과 함께, 다크 지도 색상·서체의 재사용 범위 및 이 목록에 한정한 값임을 명시한다.

#### 유지할 점

24px 제목, 18px 이름, 14px 날짜와 80px 사진으로 정보 순서가 분명하다. 두 화면 모두 32px 패널 상단 모서리, 선택 마커, Mapbox 로고와 출처 버튼이 보인다. 3건은 세 행 전체와 14px 여백을 보여 준다. 7건은 세 행 전체와 실제 네 번째 행 상단 26/104px를 보여 준다. 잘린 썸네일 14px가 목록이 이어짐을 알리고, 네 번째 이름과 날짜는 가려진다. SVG에서 같은 목록의 네 번째 행이 클립되는 구조를 확인했다.

#### 미검증

실제 Figma 진입·복귀·출처·목록 스크롤과 마지막 행 조작, 정확히 4건인 HTML의 끝까지 스크롤 및 기록 ID 수신, 좁은 화면과 큰 글자에서의 동작은 후속 단계에서 확인한다.

## 수정 후 독립 검토

**Phase 5 / ready.** Directly opened both requested PNGs. Independently decoded the 7-record PNG pixels: card starts y=784, photo y=796, both visible at y=809 and both clipped at y=810, confirming 26/104px, 14px of photo, and no 4th name/date. Three-record PNG shows all three complete rows with no peek. Both show matching highlighted count, map, legible Mapbox logo, attribution and close above the rows without overlap. Parsed SVG: ordered 3 and 7 record IDs match the approved wireframe, each 358×104px, close 48×48px and attribution 44×44px. `components.json`/generated DESIGN specify separate selected/keyboard focus for markers, focus for attribution, focus/pressed for close and rows with named color tokens, sticky header, reset-to-top on switch, and detail by record ID. No required Phase 5 changes. Deferred actual Figma navigation/return and attribution behavior, list scroll/end and exactly-four HTML tap with record ID, small viewport/large-text, and actual focus/pressed behavior. Read-only; no prior critique, edits, or approval. `shasum` verified every supplied hash; requirements ca74d3e5e2b8d6aa309c6cdf8afab7f5ad8e89262bf702b4515dae0005e4a560; base DESIGN fee42b2e4e4b94ec874b29f51af2675b21cc41984ee0d5df5069e54504121c39; review 2fe085e9b61ac41502fc7326b80792fd9ee7995e62f924417ed7c136b762854f.

검토한 시안의 SHA-256은 3건 `4c8d9e079a8481ccaefc9287c9624facbdaa2b0cb5d9067bc05f08cab12e1a55`, 7건 `f49b61a9f644983906c7881606f608ee49b03064504a57d65fcddda9a8f176b3`다. 검토한 `tokens.json`은 `aa59358385eff880121c555c257120bea9e3ca82cc04d94a81ad02432999bc36`, `components.json`은 `a777d4c8a82d9db9d825f111e0510040f9069addab78d2b462f8bb41d08bb245`, 생성 `DESIGN.md`는 `517432176c84c22340fd05c218762ea44984bafb1cbdc78fe8be07fa2ed5bca1`이다.
