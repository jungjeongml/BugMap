# 07 최종 검수 독립 비평

## 초기 플레이어 캡처 검토

**판정 `needs_revision`.** 실제 Figma 플레이어 캡처 2장을 다시 확보하면 재검토할 수 있습니다.

- **중요 · ENTRY-01.** `01-map-before-entry.png`에는 시작 지도 대신 Figma 로딩 화면이 보입니다. `41:81`과 기록 버튼이 표시된 뒤 캡처해야 진입 전 상태의 근거가 됩니다.
- **중요 · ENTRY-02, ENTRY-06.** `05-entry-ready.png`에서 첫 썸네일이 비어 있습니다. 네이티브 PNG에서는 사진 세 장이 정상 표시됩니다. 현재 플레이어 본문의 변경 픽셀 17,952개에는 스크롤과 지연 로딩의 차이가 섞여 있습니다. 세 사진이 표시된 뒤 스크롤 전후를 다시 캡처하고 런타임 해시와 픽셀 집계를 갱신하십시오.

네이티브 화면 2장, 본문 내보내기 2장, 플레이어 7장, 기존 지도 원본을 직접 열었습니다. 첫 진입과 완료 모두 메모까지 스크롤되며 하단 버튼 상태와 위치가 유지되는 것을 캡처에서 확인했습니다. 두 지도 복귀 PNG는 동일하고, 기존 지도 원본의 SHA-256 `3c391df201a8b53222204ba5594e87db41ca6ce24f2b103d50ae5cd54ede9b2c`가 제작 전후 기록과 일치합니다. 기존 루트 11개와 프레임 PNG 5장의 보존 근거도 일치합니다.

검토한 `report.md` SHA-256은 `7b40284103a7770701010a66b2c9285aaaa059873f5f8fb08512b7a305b9fb5a`, `coverage.csv`는 `0b4dff1caca9f091db6fe4c31554e1729c521fb9bf827f85a5d27e866b2a0a47`입니다. Stage 05 승인 `177a8516-82fe-4689-a7c0-961bf42cd782`의 파일 해시 64개가 일치합니다. Figma 검사 303개 노드와 웹 검사 2회 모두 이슈 0개였고 검사 입력·출력 및 플레이어 PNG 해시가 기록과 일치합니다. 임시 작업본에 빠진 상대 참조 6개는 정식 저장소 위치에 대상이 있습니다.

위 캡처 문제 외에 7개 요구사항과 승인된 제품 흐름 사이의 불일치는 발견하지 못했습니다. 실제 카메라·GPS·선택기·이탈 확인·저장·공개 위치·실기기 접근성은 제품 검증 범위입니다. 이번 비평에서는 플레이어를 직접 조작하거나 사람 리뷰·승인을 기록하지 않았습니다.

## 재캡처

Chrome 플레이어에서 지도와 세 사진의 표시를 눈으로 확인한 뒤 같은 경로를 한 번 더 조작했다. 새 JPEG 일곱 장과 해시를 연결하고 픽셀 비교를 다시 계산했다. [플레이어 결과](prototype-runtime.json) · [현재 픽셀 비교](player-pixels.json)


## 표시가 완료된 Chrome 캡처 재검토

**Stage 07 — ready for human review.**

I opened all seven Figma player captures, four native exports, and both approved design-system screenshots. The existing map shows the record-entry CTA and Mapbox logo. The ready screen shows all three thumbnails. In both states, scrolling reveals the full memo while the submit button stays fixed. Both return captures show the same map. I reviewed the coordinator’s browser evidence and native readback without operating the player myself.

All seven coverage rows match `ENTRY-01` through `ENTRY-07`. The current native and web lint artifacts match their input and output hashes and report zero issues. All seven runtime capture hashes and four native export hashes match. Both CTA comparisons returned zero changed pixels out of 11,700. The reported body counts reproduced from the coordinator’s decoded images and varied slightly with a separate JPEG decoder.

The disclosed Noto Sans KR substitution and first-view memo boundary are visible. Neither obscures content needed for the representative task. Camera, GPS, save and retry, unsaved-exit confirmation, and device accessibility remain product verification items.

Reviewed `report.md` at `a2deeff1…`, `coverage.csv` at `f4ff5439…`, and `prototype-runtime.json` at `94d786ea…` against approved design system `177a8516-82fe-4689-a7c0-961bf42cd782`.

본문 픽셀 수는 macOS `sips`로 JPEG를 PNG에 디코딩한 값으로 계산했음을 비교 기록에 명시했다. 별도 디코더에서도 두 완료 버튼의 변화 픽셀 수는 0개였다. [픽셀 대조](player-pixels.json)

