# 05 첫 로그인 리서치 출처

## 승인된 재현 기준

한국어 모바일 사용자가 첫 화면에서 사진으로 곤충을 기록하고 주변 발견을 지도에서 살펴보는 앱임을 이해한 뒤 로그인 방법을 고르는 과업을 기준으로 삼았다. 하네스에서 PRD 승인 `bc172c53-cf59-4d91-9d5e-66658726b19b`과 입력 해시를 대조했다. 승인 범위는 BugMapHaness의 390×844 `login/default` 한 장이다. [PRD](../01-prd/PRD.md) · [요구사항](../01-prd/requirements.csv) · [대상 설정](../control/figma.json)

| 입력 경로 | SHA-256 |
|---|---|
| `01-prd/PRD.md` | `57d0ed3672020c90bd263a166e07232a792a2f3eb6317e393dd108221656970c` |
| `01-prd/requirements.csv` | `d05372d930cdd117af368d919471fbf8242d002d7596e1ca582a2aeee2cc74b9` |
| `control/figma.json` | `2d062a50a0e7c15ae856a491257bd2b7691637b7aaa13c8018005056bf3c1b53` |
| `01-prd/evidence/bugmap-05-source.png` | `71cd76a4641eb61fb17f45bf6e8b386e97764ab6b3d81cf1b97d3d4a7f22319f` |
| `01-prd/evidence/source-05-tree.json` | `af46734ca3d95d536e5f39b4746efa41e568a7cf707ec435eb46a8a2d1758c85` |
| `01-prd/evidence/target-document.json` | `6bd3abacd43508993014a8caf133f425242147f40173ff198f419923606c3f61` |
| `01-prd/evidence/target-existing-map.json` | `c794b9843adaf4cb823277ee4e50f40291b9174fae547565c1edbf48259d7df4` |

`2026-11-19T07:38:19.246Z`에 TalkToFigma로 보존한 05 프레임의 캡처를 2026-11-19에 이미지 도구로 열고 노드 트리와 대조했다. 트리의 파일 키는 null이다. 원본 노드와 채널은 승인된 대상 설정을 따르며, 본 단계에서 Figma 세션을 다시 조회하지 않았다. [Figma 05](https://www.figma.com/design/LynbxdW8Qf7TavCrPLd2nY/BugMap?node-id=134-1239) · [390×844 원본 캡처](../01-prd/evidence/bugmap-05-source.png) · [노드 트리](../01-prd/evidence/source-05-tree.json)

## 제공자 공식 참조

`work/bugmap-login-kyro/02-research/`의 공식 웹 PNG 세 장과 해당 묶음의 `refs.json`, `captures.json`을 바이트 단위로 재사용했다. 매니페스트에 기록된 원래 캡처 실행 시각은 `2026-11-12T19:38:15.761Z`이다. 2026-11-19에 세 PNG를 모두 이미지 도구로 직접 열고 해시와 PNG 치수를 확인했으며, 공식 웹 문서의 지침을 별도로 다시 읽었다. [원래 캡처 메타데이터](captures.json) · [재사용 검증](reuse-verification.json)

| 참조 | 요청 URL 및 최종 URL | 시각 근거 | 선정 이유 |
|---|---|---|---|
| 카카오디벨로퍼스 | [디자인 가이드의 카카오 로그인 버튼 절](https://developers.kakao.com/docs/ko/kakaologin/design-guide#%EC%B9%B4%EC%B9%B4%EC%98%A4-%EB%A1%9C%EA%B7%B8%EC%9D%B8-%EB%B2%84%ED%8A%BC) (일치) | [kakao-official.png](captures/kakao-official.png), 1280×1800, `32d51b7af3ae5d05a1fc4e48542db5e036f2c3cacfd8eeef75868424d1924e60` | 말풍선·국문 완성형·노란 외곽을 대조한다. 커스텀 컨테이너 반경과 크기 확장 기준은 공식 웹 본문에서 확인했다. |
| NAVER Developers | [네이버 로그인 버튼 사용 가이드](https://developers.naver.com/docs/login/bi/bi.md) (일치) | [naver-official.png](captures/naver-official.png), 1280×1800, `7058420b292812f1a443f7fa5bb8b5ec6b011c7c663cca1d785d65086e43bf0f` | 녹색 권장형과 흰 배경 완성형의 차이, 지정색, 국문 자산 유형을 확인한다. 타사 버튼 병행 지침은 공식 웹 본문에서 확인했다. |
| Apple | [요청 URL](https://appleid.apple.com/signinwithapple/button) → [최종 URL](https://account.apple.com/signinwithapple/button) | [apple-official.png](captures/apple-official.png), 1280×4096, `2ae30281f5a7856d12b6ab849f4d5f87e18139ce5d042970a771549e58e07b11` | 검정 바탕·흰 로고·레이블의 가운데/왼쪽 정렬 샘플을 대조한다. 캡처의 상단 내비게이션 스타일은 일부 누락됐으며 본문 버튼 샘플은 표시된다. 이번 웹 텍스트 조회에서도 생성기 본문을 읽을 수 없어 정책은 Apple HIG의 [공식 Markdown 본문](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple.md)에서 확인했다. |

가이드 캡처는 시각 리서치 자료다. 제작에 쓸 개별 파일의 다운로드 URL과 해시는 실제로 선택한 자산에 연결해야 한다. 카카오 [공식 리소스 목록](https://developers.kakao.com/tool/resource/login)과 네이버 [한글 자산 목록](https://developers.naver.com/docs/login/bi/bi.md)을 확인했다. 리서치 웹 도구에서 네이버 PNG ZIP의 다운로드 응답은 확인하지 못했다. Apple의 [공식 생성기](https://account.apple.com/signinwithapple/button)는 재사용 PNG에 표시되며 한국어 설정·PNG 생성은 이번 단계에서 조작하지 않았다.
