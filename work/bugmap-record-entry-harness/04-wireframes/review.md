# 발견·채집 기록 구조·와이어프레임 검수

## 입력과 생성 결과

2026-11-20 KST에 정식 프로젝트의 하네스 검사에서 개정 PRD 승인 `94ec942b-5954-47c6-aede-c7b069cae9a9`가 유효함을 확인했다. [승인 PRD](../01-prd/PRD.md) · [수용 기준](../01-prd/requirements.csv)

| 입력 | SHA-256 |
| --- | --- |
| [PRD](../01-prd/PRD.md) | `b6e7811c9537e86431a90fbd1ce33b18cd22fc7934ede5e0bc3a84a07ce0b46f` |
| [요구사항표](../01-prd/requirements.csv) | `1ad9cef5ba7a4c3e0b58f43d7fd357e00ea8b3f2b52de457600cb31d835f3516` |
| [리서치 관찰](../02-research/findings.md) | `9662db4338c64115753c22b6e225dd35ef868801dbb5eb88bda332a37a751843` |
| [리서치 적용 제안](../02-research/recommendations.md) | `9474b57d456b1a05a9a077a76f21b3a41f82a02dc8660b43694a54cd4654fff2` |
| [리서치 출처](../02-research/sources.md) | `3bb9b4de1fc5d32bad80d8c137ee985fe85ce7abe2c370030a03a26ddb99ecc7` |

| 캡처 | 크기 | SHA-256 |
| --- | --- | --- |
| [첫 진입 0/3장](captures/record-entry/default.png) | 390×844 | `d6963325582f691602fc277347ae4cff944dcf08071865c568cb95b53efd12e1` |
| [입력 완료 3/3장](captures/record-entry/ready.png) | 390×844 | `aff7d7a745d557213579a390b566a161bba790ebce1350ec70b4b6d1850ade09` |
| [첫 진입 전체 폼](full-form/captures/record-entry/default.png) | 390×920 | `528a22adf184c6d4a5a7135da3e5203f5cd076be4cd8a2f01bdd47b11e510f86` |
| [입력 완료 전체 폼](full-form/captures/record-entry/ready.png) | 390×1018 | `318be9810ec2876b8f75254ef8e50bbb7dc50668bb6347062e8f46d280afe177` |

Chromium으로 생성한 PNG 네 장을 직접 열어 제목·장수·장소와 날짜 예시, 본문 순서, 잘림과 겹침을 점검했다. PNG 헤더의 치수, SVG의 치수와 문구, 두 보고서의 JSON·SVG·PNG 해시를 실제 파일과 대조했다. [대표 화면 생성 기록](wireframes-report.json) · [전체 폼 생성 기록](full-form/wireframes-report.json)

## 확인한 항목

| 범위 | 검수 결과 |
| --- | --- |
| ENTRY-01 진입·이탈 | 뒤로 가기 영역은 56×48px이다. 기존 지도 버튼 `41:443`에서 첫 작성 화면을 열고 입력이 없으면 지도 `41:81`로 돌아간다. 미저장 입력이 있으면 계속 작성하거나 나가는 경로를 흐름에 정의했다. |
| ENTRY-02 사진 | 첫 화면의 `0/3장`과 촬영·첨부 각 172×48px을 확인했다. 완료 예시의 `3/3장`, 세 썸네일과 각각 44×44px 삭제 조작, 추가 비활성 및 다시 추가 안내를 확인했다. 필수 값이 유효하면 1~3장으로 저장하며 3장 도달, 삭제 후 재추가, 권한 저하와 업로드 실패 복구를 상태로 정의했다. |
| ENTRY-03 이름·유형 | 이름 입력과 이름 모름을 별개로 제공한다. 완료 예시에서 관찰 한 가지가 선택된다. 이름과 이름 모름의 배타 적용 및 유형 단일 선택을 상태표에 정의했다. |
| ENTRY-04 발견 위치 | 두 뷰포트에서 ‘발견 위치 · 필수’ 한 항목과 358×48px 지도 확인·변경 버튼, 172×44px ‘현재 위치 사용’을 확인했다. 현재 위치 버튼은 첫 화면의 `y=496`, 완료 화면의 `y=594`에서 모두 잘리지 않고 표시된다. 상태·흐름은 GPS 권한 거부와 위치 확인 실패의 재시도·지도 직접 선택 및 취소 시 이전 값 복귀를 다룬다. 새 기록 저장 시 발견 위치로 대략 공개 좌표를 자동 생성하는 안, 타인용 지도·조회에 공개 좌표만 제공하는 조건, 게시 전 사진 EXIF 위치 정보 제거를 제품 흐름에 적었다. 공개 위치 해상도는 제품 결정으로 남았다. |
| ENTRY-05 날짜·시간·메모 | 위치 아래 날짜와 시간은 172×48px의 별도 편집 조작이다. 전체 조작이 두 대표 화면에 표시된다. 그 아래에 높이 112px의 선택형 여러 줄 메모를 두었다. 첫 화면에는 메모 제목과 입력 영역 상단 52px이 보인다. 이전 날짜 선택과 발견 일시·게시 시각 분리, 저장한 메모의 줄바꿈을 포함한 상세 보존을 제품 흐름에 적었다. |
| ENTRY-06·07 완료·안전 영역 | 두 대표 화면의 ‘작성완료’는 `x=16, y=758, 358×48px`에 있고 초기 비활성과 완료 예시의 활성이 구분된다. 하단 안전 영역은 34px이고 버튼 끝에서 화면 바닥까지 38px이다. 스크롤 본문은 `y=108~728`이다. 정적 좌표상 최대 스크롤 위치의 메모 하단은 두 상태 모두 `y=712`다. 네 시안의 모든 조작 영역은 최소 44×44px이고 조작 영역끼리 겹치지 않는다. 저장은 사진 1~3장, 이름 또는 이름 모름, 유형, 발견 위치 및 발견 날짜·시간의 유효 여부를 사용한다. 저장 중 중복 제출 잠금, 초안 유지·실패 재시도, 같은 지도에 새 기록 반영을 상태와 흐름에 기록했다. |

두 전체 폼은 대표 시안과 동일한 본문 좌표를 펼친 보조 증거다. 두 대표 정적 캡처 오른쪽에는 3px 폭의 스크롤 표시가 있다. 첫 진입에서는 메모의 상단만 정적으로 그렸고, 완료 예시의 메모는 첫 화면 아래로 이어진다. 전체 메모 조작과 문구는 각 전체 폼에서 확인할 수 있다. 두 대표 캡처에서 제목과 필드 값이 잘리지 않는다. 후속 Figma·웹에서는 섹션이 연속으로 스크롤되는지 확인한다. [화면표](../03-structure/screens.csv) · [상태표](../03-structure/states.csv) · [흐름](../03-structure/flows.mmd)

## 재생성

저장소 루트에서 [레이아웃 원본](layout.mjs)을 실행하고 하네스로 렌더한다.

```sh
wire="$PWD/work/bugmap-record-entry-harness/04-wireframes"
aux="$(mktemp -d /private/tmp/bugmap-record-entry-fullform.XXXXXX)"
node "$wire/layout.mjs" "$wire" "$aux/work/full-form/04-wireframes"
node tools/design-harness/bin/design-harness wireframe --project bugmap-record-entry-harness --force
node tools/design-harness/bin/design-harness wireframe --root "$aux" --project full-form
```

임시 전체 폼 생성 폴더의 JSON, SVG, PNG, 생성 기록을 `full-form/`에 정리했다. 대표 `wireframes.json`에는 390×844 상태 두 개가 들어 있다.

## 후속 검증

Figma 플레이어에서 기존 지도와의 진입·복귀, 스크롤 중 버튼 고정, 편집 가능한 노드와 조작 영역, 기존 지도·공식 Mapbox 표시·연결을 검증한다. 다크 스타일의 색·대비와 실제 사진·지도 표현은 다음 디자인 단계에서 검토한다. 카메라·파일 접근, GPS와 권한 복구, 공개 좌표와 사진 EXIF 처리, 업로드·저장 및 상세의 메모 보존은 제품 구현에서 확인한다. 곤충 이름·장소·날짜와 시간은 입력 완료를 보여주는 예시 값이다.
