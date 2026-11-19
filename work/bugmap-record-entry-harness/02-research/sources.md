# 작성 화면 참조 출처

2026-11-20 KST에 메인 지도 기준 캡처와 기존 작성 시안과 iNaturalist 공식 도움말의 앱 예시 두 장을 각각 이미지 도구로 직접 열었다. 공개 도움말의 예시는 임시 Chromium에서 원본 이미지 URL을 390×844로 캡처했다.

| 자료 | 출처·선정 근거·확인 범위 | 확인한 크기와 SHA-256 |
| --- | --- | --- |
| BugMap 메인 지도 | [실제 Figma 캡처](../../bugmap-main-map-harness/06-figma/captures/main-map-default.png)와 [기존 인계](../../bugmap-main-map-harness/08-handoff/HANDOFF.md). 지도에서 작성 버튼이 시작되는 위치, 다크 배경, 하단 탐색, 강조색을 확인하기 위한 현재 기준이다. | 390×844 · `3c391df201a8b53222204ba5594e87db41ca6ce24f2b103d50ae5cd54ede9b2c` |
| BugMap 기존 작성 폼 | [전체 펼친 폼 캡처](../../../design/record-entry/12%3A235.png)와 [기존 화면 명세](../../../docs/screens/record-entry.md). 사진·곤충 정보·위치·일시·메모·저장 순서를 확인하기 위한 기존 라이트 시안이다. | 390×1432 · `d62d12c70c2f54e1841ae20f0256225dc70d0049c0cdb95534c3182787cf02d2` |
| iNaturalist Evidence | [공식 편집 도움말](https://help.inaturalist.org/en/support/solutions/articles/151000197239)의 Evidence 예시를 [원본 이미지](https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/151100266970/original/GTIlaw7hO9EWmh83Kxy1OoqAj5l4m7SnEw.jpeg?1725892852=)에서 캡처했다. 최종 URL이 원본과 같다. [실제 캡처](captures/inaturalist-evidence.png)에서 사진 추가·사진·장소·시간의 표시를 대조했다. | 390×844 뷰포트 · `626b9cb29f9d00c255c27319d6bf3c5ce4193f40a3886491e03988bc697d8a81` |
| iNaturalist Other Data | 같은 [공식 편집 도움말](https://help.inaturalist.org/en/support/solutions/articles/151000197239)의 Other Data 예시를 [원본 이미지](https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/151100267679/original/qnTLR3dPV-7MJVk0Tq_5eauiJnXjGToDPw.jpeg?1725892961=)에서 캡처했다. 최종 URL이 원본과 같다. [실제 캡처](captures/inaturalist-other-data.png)에서 공개 설정과 메모 진입점을 대조했다. | 390×844 뷰포트 · `8130a99566925fb7e0670e0938d2bec2d3be5c6476c31a1d99b3ad80c233eb6d` |

iNaturalist 예시의 브라우저 여백은 이미지 URL을 캡처하면서 생겼다. 원본 이미지 자체는 앱 전체가 아니라 도움말에 표시된 섹션이다. CLI 시각은 2026-11-20 03:02:45 KST이며 상세 메타데이터는 [캡처 보고서](captures.json)에 있다.

## 승인 입력

- 이번 개정에 적용한 PRD 승인 `94ec942b-5954-47c6-aede-c7b069cae9a9`는 정식 프로젝트의 하네스 검사에서 `passed`다. [PRD](../01-prd/PRD.md) SHA-256은 `b6e7811c9537e86431a90fbd1ce33b18cd22fc7934ede5e0bc3a84a07ce0b46f`, [수용 기준](../01-prd/requirements.csv) SHA-256은 `1ad9cef5ba7a4c3e0b58f43d7fd357e00ea8b3f2b52de457600cb31d835f3516`이다.
- 최초 리서치 당시 PRD 승인은 `4137d5d0-e65b-4f96-9394-0c84656901ac`이며 정식 프로젝트의 하네스 검사에서 `passed`였다. 당시 `01-prd/PRD.md` SHA-256은 `af6636f9b67eefb60fcadd57a8e4bf6c903102ac2eb0f919b45cbe1e63161fca`, `01-prd/requirements.csv` SHA-256은 `9d06834b616c7fea3a381e25db712bb1fbc85e089385f8b1ea5a9d578b317eae`다.
- [제품 PRD](../../../docs/PRD.md), [제품 TDD](../../../docs/TDD.md), [다크 디자인 기준](../../../docs/DESIGN.md#지도-중심-다크-팔레트)을 함께 대조했다. [iNaturalist 첫 작성 도움말](https://help.inaturalist.org/en/support/solutions/articles/151000197160-how-to-make-an-observation-with-inaturalist-next)은 카메라와 보관함 가져오기가 별도 경로임을 확인한 설명 근거다.
