# 기록 묶음 선택 리서치 출처

2026-11-24 KST에 세 PNG를 이미지 도구로 직접 열어 확인했다. 로그인한 관찰·채집 사용자가 발견 지도에서 `기록 3`을 선택하여 위치 맥락과 세 공개 기록을 첫 화면에서 함께 확인하는 과업을 기준으로 삼았다.

## 승인 입력

정식 저장소에서 `node tools/design-harness/bin/design-harness check --project bugmap-record-cluster-harness --json`을 실행했다. 1단계 PRD는 `passed`였고 승인 ID는 `1edd277b-9ad7-4aec-b138-ffc18a9a654a`였다. 실행 당시 2단계 리서치가 현재 단계였으며 이 폴더의 산출물은 작성 전이었다.

| 입력 | SHA-256 |
| --- | --- |
| [PRD](../01-prd/PRD.md) | `ae9ec63ca386829cf5469755e0b130baca7aec34492fdc09e5c9add03673cd96` |
| [요구사항 표](../01-prd/requirements.csv) | `395db1c7c53afc9ab58f98d234ec7b0754aa343ea127f66c3bfbd61d531a3587` |
| [프로젝트 설정](../control/project.json) | `5422ee12f027912acd0d8976e4e6653c1c44e9af66af2395c20b7c1a668a5a3a` |

대상은 한국어 모바일 `main-map/cluster-selected` 한 화면이다. 390×844에서 지도·선택 마커·세 행·지도 출처를 함께 표시할 수 있는 배치와 참조에서 가져올 정보 위계를 조사했다. 기존 디자인 기준 및 공개 위치·개별 기록의 정책도 대조했다. [공통 디자인 기준](../../../docs/DESIGN.md#메인-발견-지도) · [메인 지도 명세](../../../docs/screens/main-map.md#기록-묶음-선택) · [제품 PRD](../../../docs/PRD.md#5-기능-요구사항) · [TDD](../../../docs/TDD.md#지도-표시와-내-주변-반경)

## 직접 확인한 화면

| 출처와 선정 근거 | 원본·캡처 시점 | 픽셀 크기와 SHA-256 |
| --- | --- | --- |
| Kyro 광교호수공원. 선택 대상과 하단 정보가 화면에 공존하는 방식 확인. | 사용자가 첨부한 로컬 원본 `/Users/mac/Downloads/kyroMakerClick.png`. 원본 URL·앱 버전·촬영일은 제공되지 않았다. [첨부 원본 사본](captures/kyroMakerClick.png) | 1125×2436 · `5dbbbb9749e6eb68a1f967e9cf716af8d24f5f890571d75cf629685af3e991c4` |
| BugMapHarness 메인 지도. 390×844 기준에서 새 패널과 공존해야 하는 마커·지도 출처·지도 조작부의 위치 확인. | Figma 원본은 BugMapHarness Page 1의 `41:81`이다. 제작 기록은 2026-11-19이며 정확한 캡처 시각은 기록에서 확인되지 않는다. 저장소 PNG를 열었다. [Figma 원본](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=41-81) · [저장소 캡처](../../bugmap-main-map-harness/06-figma/captures/main-map-default.png) · [원본 제작 기록](../../bugmap-main-map-harness/06-figma/change-log.md) | 390×844 · `3c391df201a8b53222204ba5594e87db41ca6ce24f2b103d50ae5cd54ede9b2c` |
| Mapbox Attribution. `CLUSTER-05`의 공식 로고와 출처 UI가 지도에 노출되는 배치 검토. | 원본과 최종 URL은 동일하다. 2026-11-19 22:20:42.257 KST(13:20:42.257 UTC)에 이전 메인 지도 하네스가 CLI로 저장한 PNG를 사용했다. 2026-11-24에 같은 공식 페이지를 다시 열어 iOS·Android의 정보 버튼 안내도 읽었다. [공식 문서](https://docs.mapbox.com/help/dive-deeper/attribution/) · [웹 캡처](captures/mapbox-attribution.png) · [캡처 보고서](captures.json) | 1280×1000 · `228cb9d6fe5c61a712e536f3c83486b9e92fee4167b0414a12a9d56feed63990` |

Mapbox의 [참조 입력](refs.json), [캡처 보고서](captures.json), [PNG](captures/mapbox-attribution.png)는 이전 프로젝트의 실제 CLI 증거 한 세트를 바이트 그대로 재사용했다. `refs.json`의 `HOME-07`은 당시 선정 근거다. 이 프로젝트에서는 `CLUSTER-05`의 근거로 인용한다. Kyro 첨부와 Figma 내보내기는 로컬 입력이므로 별도로 기록했다. 비공개 원본의 외부 전송이나 유료 자료 조회는 없었다.
