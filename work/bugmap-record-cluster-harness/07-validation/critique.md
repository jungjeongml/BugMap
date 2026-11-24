# 기록 묶음 시안 검증 독립 비평

## 첫 검토

**판정 `needs_revision`**  
390×844 기본 글자 크기의 두 Figma 상태와 정확히 4건인 HTML의 검증 증거는 일치한다. 승인 PRD가 요구한 작은 화면·큰 글자·긴 이름 검증은 남아 있다.

- **중요 · CLUSTER-07.** `coverage.csv`는 전체를 `verified`로 표시하고 `APP-03`은 작은 화면과 큰 글자 확인을 앱 검증으로 넘긴다. 승인 PRD와 디자인 시스템 검토는 글자 확대 시 긴 이름의 잘림·겹침, 모든 행의 접근, 지도·마커·패널의 가시성을 후속 검증 범위에 둔다. 현재 HTML은 390px 고정 폭과 SVG 텍스트를 사용한다. 작은 화면과 큰 글자 조합에서 긴 이름을 넣고 시작·끝 캡처와 마지막 행 접근 증거를 추가해야 한다.
- **경미 · CLUSTER-03.** 동일 공개 좌표의 행별 상세 대응은 `04-wireframes/wireframes.json`의 `publicCoordinateGroup`, `recordId`, `detailRecordId`에 있다. `coverage.csv`에 이 근거를 추가하면 추적이 가능하다. 제품의 실제 상세 열기와 Mapbox SDK 출처 열기는 앱 검증 항목으로 기록돼 있다.
- **확인한 동작.** Figma 플레이어 PNG 10장과 HTML 스크롤 PNG 4장을 직접 열었다. 3건과 7건에서 각각 지도와 메뉴바로 돌아왔고, 7→3→7 전환과 닫은 뒤 재진입 모두 7건 시작 이미지와 해시가 같다. 7건 시작에서 네 번째 행 상단 26px만 보이고 스크롤 끝에는 일곱 번째 행이 안전 영역 위에 온전히 보인다. HTML 조작 기록은 정확히 4건과 7건의 마지막 행 ID를 각각 받았다. Figma의 Noto Sans KR과 HTML의 Pretendard는 보고서에 명시돼 있으며 기본 크기 캡처에서 글자 충돌은 보이지 않았다. 이번 검토는 기존 조작 기록과 캡처를 대조했다.

**검토 버전 · SHA-256 앞 12자리**  
PRD `eb54511e377a`, 요구사항 `ca74d3e5e2b8`, 와이어프레임 `899b024b7b56`, 디자인 시스템 검토 `2fe085e9b61a`, Figma 변경 기록 `9dc41957a5b5`, 노드 매핑 `d39c917edb7d`, 네이티브 노드 `78af3faef862`, 반응 조회 `d58709b64eb4`. 검증 후보는 coverage `9804ccb1e300`, report `aedb361a636d`, issues `3a0573357d3c`, Figma lint `cda5e3e5a744`, web lint `530c41557de1`, player `dd446da205b3`, web scroll `ad4bc2a15407`이다. 원본 입력 해시 40개와 캡처 해시 16개가 모두 일치했다.

## 작은 화면 및 확대 글자 검증 추가 후

Stage 7 critic verdict `ready` within approved design-harness scope. Directly viewed all four adaptive PNGs, exact-4 start/end, Figma 7 start/end/reopen. Adaptive SHA `b3310a88a0f6a0fa10e44b146961ebc1895371457381ded3eceb39596eecc3c8` matches, capture hashes match; long name readable at 2/3 lines, 104/187.92 px, no observed overlap, both markers and controls visible, 7 rows reached and last click ID `record-overflow-demo-07` in recorded Chromium evidence. Exact 4 shared geometry, 26px peek, 78px scroll, full fourth above safe area and ID `record-overflow-demo-04`. Figma end shows full seventh, reopen hash matches start. No important blockers. Clarify in critique that 320×700 is a independently composed responsive HTML probe with explicit title/name/date scaling, and reviewed recorded interactions without independently operating the player. Actual SDK attribution, details, and system zoom/accessibility are correctly tracked follow-ups.

320×700 검증용 HTML은 승인 토큰과 샘플을 사용해 좁은 화면의 가변 높이 배치를 별도로 구성했다. 두 배율에 맞춰 제목·이름·날짜의 글자 크기를 적용했다. 비평가는 캡처와 기록된 조작 결과를 대조했다.
