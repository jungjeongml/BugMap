# 참조 출처

2026-11-20 KST에 사용자 첨부와 기존 BugMap 시안을 직접 열었다. Apple 공개 가이드는 임시 Chromium으로 캡처했다. 정적 캡처의 관찰과 실제 동작 검증을 구분한다.

| 자료 | 출처·시점·확인 범위 | 해상도 · SHA-256 |
| --- | --- | --- |
| Kyro 확장 화면 | 사용자가 첨부한 [kyroScrollMenu.png](../01-prd/evidence/kyroScrollMenu.png). 검색 → 거리 버튼 → 사진과 메타데이터를 포함한 목록, 지도 복귀와 하단 탐색의 화면상 위치를 확인했다. 원본 앱 버전과 촬영 일시는 미상이다. | 1125×2436 · `126cb82cd467621a948b3a6c58b97303bc37a869e991481612275bc6a82d2beb` |
| BugMap 기본 지도 | 기존 메인 지도 [실제 Figma 캡처](../../bugmap-main-map-harness/06-figma/captures/main-map-default.png), [단계 인계](../../bugmap-main-map-harness/08-handoff/HANDOFF.md). 기본 지도 노드 41:81과 손잡이 41:451을 문서와 대조했다. 화면 색·검색 문구·하단 네 탭의 시각 기준이다. | 390×844 · `3c391df201a8b53222204ba5594e87db41ca6ce24f2b103d50ae5cd54ede9b2c` |
| Apple Human Interface Guidelines · Sheets | 원본 및 최종 URL은 [Apple Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)다. 2026-11-20 01:01 KST의 [CLI 캡처](captures/apple-hig-sheets.png)는 문서 상단의 시트 개요를 보여준다. 아래쪽 플랫폼 설명에서는 접힌 높이와 확장 높이, 드래그 손잡이에 관한 원칙을 확인했다. | 1280×1060 · `42984470aff14db6c4fe93bab337c0eec056bbbe429282bbbd4164086a85d313` |

## 승인 입력

- `design-harness check`에서 PRD `passed`와 승인 `9e02aa07-23ee-4e87-8530-39e1f406f67b`를 확인했다. [PRD](../01-prd/PRD.md) SHA-256 `068003f641e473ad03b0c2f643b276c5169d61dea860d0da534c1b871554f788`, [수용 기준](../01-prd/requirements.csv) SHA-256 `2bae438a56f22f8e04968b02421991fc6b0da84134b1228efd4a99699973a1e9`.
- [제품 PRD](../../../docs/PRD.md), [지도 TDD](../../../docs/TDD.md#지도-표시와-내-주변-반경), [메인 지도 명세](../../../docs/screens/main-map.md)와 [다크 디자인 기준](../../../docs/DESIGN.md#메인-발견-지도)을 의사결정 기준으로 사용했다.
- 기본 샌드박스에서 Chromium이 종료되어 승인된 임시 브라우저 실행으로 재시도했다. URL·크기·시각·입출력 해시는 [캡처 보고서](captures.json)에 기록했다.
