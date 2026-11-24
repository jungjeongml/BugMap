# 기록 묶음 핸드오프 독립 검토

## 첫 검토

**판정 — `needs_revision`.** 화면과 검증 근거는 인계 내용과 일치한다. 승인 요청 전에 후속 항목의 담당과 출시 영향을 기록해야 한다.

**검토 범위와 버전.** `HANDOFF.md`의 SHA-256 `919090d2a8eee1379f45236aba48fe76639708d12f55a3be638b301314acad49`와 `manifest.json`의 `a8cb4bbfb9cdd5d2778371beff5b5c2b4ffb2a8da29ab1f26d2866068fdd9735`를 확인했다. 매니페스트의 파일 142개 해시가 일치하고 사진 7개는 디자인 시스템의 원본 크롭과 바이트가 같다. 공식 `check`는 1~7단계 통과와 8단계 `awaiting_approval`을 반환했다. 검증 승인 ID는 `7a74d71b-2372-4534-9a26-e8222a9c36e5`다.

**발견**

- **중요.** `08-handoff/open-items.md:1–6`은 항목·확인 기준·근거를 기록한다. `docs/design-harness.md:65`가 요구하는 담당과 출시 영향, 사람의 수용 근거가 빠져 있다. 각 앱 항목의 담당 역할과 처리 완료 조건, 기능 출시 전 확인이 필요한 이유를 명시하고, 기존 7단계 검토·승인 범위와 대기 중인 8단계 수락을 구분한다.
- **경미.** `08-handoff/implementation-notes.md:19`와 `HANDOFF.md:33`은 토큰 연결을 `06-figma/node-map.json`에서 확인하라고 안내한다. 그 파일에는 프레임·캡처와 이미지·SVG 매핑이 있다. 토큰 연결에는 바인딩이 포함된 `nodes.json`, 반복 행은 `record-row-component.json`, 승인 값은 `tokens.json`과 `components.json`을 연결한다.

**유지할 점.** 두 390×844 네이티브 PNG를 직접 열었다. 3건 화면은 세 행 전체를, 7건 화면은 세 행 전체와 네 번째 행의 상단만 보여준다. 두 화면에서 선택 마커, 닫기, 지도 출처 요소를 확인했다. 인계의 노드 ID는 원본 읽기 결과와 일치하며, Figma 플레이어 동작과 정확히 4건인 HTML의 ID 검증, 앱에 남은 상세·SDK·접근성 검증이 구체적으로 구분돼 있다.

**미검증.** 이번 검토는 로컬 증거를 읽는 범위에서 진행했다. 라이브 Figma 조작, 수신자의 공유 권한, 제품 실기기 동작은 재검증하지 않았다. 수정 후 인계 패키지를 재생성하고 해시와 `check`를 다시 대조한다.

## 보완 후 독립 검토

Final independent verdict `ready` once the reviewed staged flow is installed. The staged flow correctly resolves the sole material stale-link issue with exact package hashes, clear app-follow-up scope, human-only approve handoff, and check instructions. Both package hashes matched; 141 manifest inputs + 1 output matched on disk; all local Markdown links/heading anchors in handoff and supporting notes resolved; all 7 licensed photo copies byte-match design originals; two frame/capture SHAs and 10 Figma image fill hashes agree; named component instances and node color bindings match their correctly attributed files. Opened both native PNGs (3 and 7); overflow shows first 3 complete and only fourth top, matching CLUSTER-07. CLI 1–7 passed, Stage 8 awaiting_approval. Validation approval 7a74d71b-2372-4534-9a26-e8222a9c36e5 and review fe129f27-b7e5-4a4f-9de8-23582d1af25f verified. Read-only; no live Figma manipulation, native product revalidation, review, or approval. No other material gap.

최종 검토 버전의 SHA-256은 `HANDOFF.md`가 `6c307a22dd75fac74c87658ae6617a8bd24aec941af6ac310023a9a19225a64d`, `manifest.json`이 `3cacb9ccc9b89d71d39cc76cb27d4f589972e7717314145af6994914ae946372`다. [최종 인계 수락 절차](../control/flow.md)
