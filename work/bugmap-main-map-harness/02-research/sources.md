# 리서치 출처

확인일은 2026-11-19다. 참고 화면은 현재 승인된 PRD에서 가정한 지도 위 조작부, 검색·탭 순서와 지도에 남는 공간을 대조하는 데 사용했다. 공개 문서와 저장소 자료를 이용했으며 외부에 비공개 자료를 전송하지 않았다.

| 출처 | 원본·캡처와 확인 범위 | 크기 및 SHA-256 |
| --- | --- | --- |
| Kyro 메인 화면 | 사용자가 첨부한 [화면 PNG](../../../example/kyroMain.png)를 직접 열었다. 지도, GPS로 보이는 버튼, 코스 만들기, 접힌 패널의 정보 순서가 판단 근거다. 원본 앱 버전과 촬영 시각은 제공되지 않았다. | 1125×2436 · `210cd1c630241e788f3d2224fdf742bf19180b5b4fc99780a02f5d6a28c75411` |
| BugMap 02 메인 발견 지도 | 저장소의 [이전 02 라이트 시안 PNG](../../../design/main-map/4:150.png)를 직접 열었다. 지도 마커와 현재 위치의 구분, 검색 문구, 버튼 배치를 대조했다. 원본 캡처 시각은 제공되지 않았다. | 780×1688 · `70b24f87fb3ee5f0561f6bd75bbf9507a4ed909bd3b992b5582a96b15c81cc63` |
| Mapbox 출처 가이드 | 원본 및 최종 URL은 [Attribution](https://docs.mapbox.com/help/dive-deeper/attribution/)이다. 22:20:42 KST에 CLI로 저장한 [공식 문서 캡처](captures/mapbox-attribution.png)를 직접 열어 지도 로고·출처 링크 예시를 봤다. 모바일 자동 표시 기준은 같은 공식 문서의 iOS·Android 절에서 확인했다. | 1280×1000 · `228cb9d6fe5c61a712e536f3c83486b9e92fee4167b0414a12a9d56feed63990` |

## 승인 입력과 시각 기준

- [이 작업의 PRD](../01-prd/PRD.md) `de96e1de9870d4e7637bb6992436e50d9508b0a8e2c0ba72aee412d31c99849c`와 [요구사항 표](../01-prd/requirements.csv) `0eac0ff77723a6047a65244e15cfa36f149a63d5f837d2febb71a01947cd8816`. 정식 저장소에서 CLI로 PRD 승인과 두 파일의 해시를 확인했다.
- [BugMap 공통 디자인 기준](../../../docs/DESIGN.md) `11c83cb492e9d02a7c6e06eb1ed21aff612d5502c1d5ac256260a3b79cf457f6`와 [메인 지도 화면 명세](../../../docs/screens/main-map.md) `cca2ad251b2703717d2d15be7b86f49c909c8092a056348205147766edc173a8`. 현재 다크 팔레트와 기본 지도 정책의 문서 근거다.
- [BugMap 07 다크 시안](https://www.figma.com/design/LynbxdW8Qf7TavCrPLd2nY/BugMap?node-id=163-1319)의 원본 픽셀은 이번 단계에서 미확인이다. 02 캡처는 이전 레이아웃을 보여주며 현재 다크 팔레트의 색상 근거는 문서에 있다.
- 브라우저 실행이 기본 샌드박스에서 빈 페이지로도 실패했다. 임시 Chrome 프로필을 사용한 독립 실행에서 공개 문서 캡처를 생성했다. [캡처 보고서](captures.json)
