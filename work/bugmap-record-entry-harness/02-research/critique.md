# 리서치 독립 비평

**Stage 02 `ready`.** 승인 PRD의 범위 안에서 구조·와이어프레임으로 진행할 수 있습니다. 사람 승인은 별도입니다.

- 정식 `01-prd/PRD.md`와 `requirements.csv`의 SHA-256을 승인 `4137d5d0-e65b-4f96-9394-0c84656901ac`와 대조했습니다. 스테이징의 `sources.md`와 `recommendations.md` 해시는 전달받은 값과 일치했습니다.
- BugMap 메인 지도·기존 작성 폼과 iNaturalist Evidence·Other Data PNG 4장을 직접 열었고 파일 해시는 `sources.md`의 기록과 일치했습니다. 지도 진입점, 촬영·첨부 두 경로, 사진 썸네일, 위치와 공개 범위의 분리, 발견 일시와 선택 메모 배치에 근거가 있습니다. 사진 3장 상한은 승인 PRD에서 가져왔습니다.
- 다음 상태표에서 ‘현재 위치 사용’, 과거 발견 일시와 게시 시각의 구분, 저장 성공 시 기존 지도에 새 기록 반영을 명시하면 추적이 쉬워집니다.
- 이번 검토는 정적 캡처에 한정했습니다. Figma 진입·복귀, 스크롤과 완료 버튼 고정, 제품의 권한·저장·공개 동작은 미검증입니다. 파일을 수정하지 않았습니다.


## 위치 공개 범위 선택 제거 검토

**02 리서치 · `ready`**. 승인 PRD와 요구사항, 후보 문서 3개의 SHA-256이 전달된 값과 모두 일치했다. 정식 프로젝트의 CLI 검사에서 PRD와 리서치가 `passed`였으며, 수정 후보는 별도로 검토했다.

메인 지도, 기존 작성 폼, iNaturalist Evidence와 Other Data 캡처를 직접 열었고 4개 파일의 해시가 출처 기록과 일치했다. 후보 문서는 예전 위치 공개 범위 행을 관찰 기록에 두고, 승인된 ENTRY-04에 맞춰 필수 발견 위치 한 항목, 현재 위치 사용과 지도 직접 선택, 공개 좌표 자동 생성, 타인 조회의 공개 좌표 사용, 게시 사진의 EXIF 위치 정보 제거를 반영했다. 공개 위치 해상도는 후속 결정으로 남겼다. [iNaturalist 편집 안내](https://help.inaturalist.org/en/support/solutions/articles/151000197239) · [iNaturalist 첫 작성 안내](https://help.inaturalist.org/en/support/solutions/articles/151000197160-how-to-make-an-observation-with-inaturalist-next)

경미한 수정 사항으로, `sources.md`의 ‘승인된 BugMap 캡처 두 장’은 ‘메인 지도 기준 캡처와 기존 작성 시안’이 더 정확하다. 기존 작성 시안 `12:235`의 별도 승인 근거는 확인하지 못했다.

구조 단계에는 승인표의 발견 일시와 게시 시각 구분, 상세 조회의 여러 줄 메모 보존, 저장 성공 후 같은 지도에 새 기록 반영, 주요 조작 영역 44×44px 기준을 함께 넘긴다. Figma와 앱 조작, GPS·권한, 공개 좌표 및 EXIF의 실제 처리는 미검증이다. 파일은 수정하지 않았다.

### 검토 버전과 반영

| 파일 | 검토 SHA-256 |
| --- | --- |
| `01-prd/PRD.md` | `b6e7811c9537e86431a90fbd1ce33b18cd22fc7934ede5e0bc3a84a07ce0b46f` |
| `01-prd/requirements.csv` | `1ad9cef5ba7a4c3e0b58f43d7fd357e00ea8b3f2b52de457600cb31d835f3516` |
| `02-research/findings.md` | `9662db4338c64115753c22b6e225dd35ef868801dbb5eb88bda332a37a751843` |
| `02-research/recommendations.md` | `9474b57d456b1a05a9a077a76f21b3a41f82a02dc8660b43694a54cd4654fff2` |
| `02-research/sources.md` | `4b854c09c31ee9c128a855f8808b478885d87bbfcf5325d73accf95496e2f1af` |

출처의 ‘승인된 BugMap 캡처 두 장’을 ‘메인 지도 기준 캡처와 기존 작성 시안’으로 고쳤다. 수정한 `sources.md`의 SHA-256은 `3bb9b4de1fc5d32bad80d8c137ee985fe85ce7abe2c370030a03a26ddb99ecc7`이다.

