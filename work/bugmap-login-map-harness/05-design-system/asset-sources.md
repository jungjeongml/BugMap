# 첫 로그인 자산 출처

2026-11-19. 원본과 공식 자산의 출처 기록을 현재 05 시안의 입력으로 사용했다. [원본 프레임 134:1239](https://www.figma.com/design/LynbxdW8Qf7TavCrPLd2nY/BugMap?node-id=134-1239) · [원본 캡처](../01-prd/evidence/bugmap-05-source.png) · [제공자 리서치](../02-research/recommendations.md)

## 지도와 BugMap 워드마크

| 표시 자산 | 출처와 처리 |
|---|---|
| [지도 및 페이드 합성 PNG](assets/map-background.png) | 원본 지도 `142:712`의 390×844 뷰포트 PNG(`d7605524824230d32409743475a87fc300d3ae8cc8effcf10fb75c5da3bf4b94`) 위에 페이드 `138:743`의 390×844 RGBA PNG(`0d18f6009f72f34dabb55d8d4af9359b3f8f6fcff5531b257adcd1df2c8dbd67`)를 알파 합성했다. 바탕은 원본 프레임과 같은 `#0B130F`다. 선형 페이드 정지점은 원본 페이드 PNG에 반영되어 있다. 크기 390×844, 합성 전체는 불투명하다. [원본 프레임과의 배경 픽셀 비교](background-comparison.json) |
| [BugMap 로고 SVG](assets/bugmap-logo-vector-lime.svg) | 기존 BugMap 워크스페이스의 `BugMap-logo-vector.svg`(`de89b48a9daee7e6c7cc647648cfe60f6fbe21cfff450b1ff50a48c81b0997ad`)에서 `#107B34` 두 곳을 `#C5EE79`로 바꿨다. 문자·곤충·핀 경로, ID, 뷰박스, 배경 없는 형태를 유지했다. 원본 1000×310을 128×39.68로 표시한다. 연결 도구의 원격 원본은 투명 PNG로 내보내졌으며 색·형상 비교에 사용했다. [원본 벡터 노드 140:712](https://www.figma.com/design/LynbxdW8Qf7TavCrPLd2nY/BugMap?node-id=140-712) |
| 관찰 예시 | 원본 `138:744`의 271×172 투명 내보내기(`ff1f1eabdf009e37cb09828f7c4ee5c927e0aa766d69c5af2285bfc1a7e7923c`)와 원본 좌표를 보고, 관찰 경계와 지점·카드 바탕을 편집 가능한 SVG 요소로 재현했다. 지명과 기록은 텍스트로 렌더한다. 곤충 표식에는 저장소의 `lucide-react-native` Bug 경로를 사용한다. [Lucide Bug](https://lucide.dev/icons/bug) · [라이선스](assets/lucide-license.txt) |

## 공식 소셜 제공자 자산

이전 [자산 보존 기록](../../bugmap-login-kyro/05-design-system/asset-sources.md)과 [최초 확인 기록](../../bugmap-login/05-design-system/asset-sources.md)을 근거로 원본 파일을 바이트 단위로 재사용했다. 카카오와 네이버의 개별 파일 다운로드 시각은 기존 기록에서 확인할 수 없었다.

| 제공자 | 원본 및 사용 방식 | 원본 SHA-256 |
|---|---|---|
| 카카오 | [공식 버튼 SVG](assets/kakao-login.svg)는 224×46 한국어 미디엄 완성형이다. 심볼과 레이블 경로를 그대로 두고 48/46 비율로 균등 확대해 중앙에 놓았다. 358×48 외곽은 별도 노란 레이어다. [공식 가이드](https://developers.kakao.com/docs/ko/kakaologin/design-guide) · [공식 리소스](https://developers.kakao.com/tool/resource/login) | `ab90ab44616f14a671844cd991b3fbb33277f42c5bb2cc5a9422344a854c9398` |
| 네이버 | [공식 흰색 중앙 정렬 PNG](assets/naver-login.png)는 1472×192 한국어 완성형이다. `(456,40)`부터 560×112를 정수 픽셀로 복사한 [표식·레이블 PNG](assets/naver-content.png)를 140×28로 사용한다. 표식 N의 색과 너비 16px, 한국어 레이블 및 개별 픽셀을 유지했다. 별도 흰 바탕과 경계가 358×48 외곽을 구성한다. [공식 가이드](https://developers.naver.com/docs/login/bi/bi.md) · [공식 PNG 묶음](https://developers.naver.com/inc/devcenter/downloads/bi/NAVER_login_KR.zip) | `d7330414dfc270da16458daf35395bbbea59246dae769f46420302a2a82f202c` |
| Apple | [공식 한국어 PNG](assets/apple-login.png)는 716×96이며 반투명 글리프와 투명 여백을 포함한다. 358×48의 검정 외곽 안에 1/2로 균등 표시한다. 표식과 레이블의 픽셀을 보존했다. [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple.md) · [공식 생성 URL](https://appleid.cdn-apple.com/appleid/button?height=48&width=358&color=black&border=false&type=sign-in&border_radius=8&scale=2&locale=ko_KR) | `fa13268354c9d261f4bb5cfb7d7e73c7030b8c1f849a114fa7b6b0c382079e89` |

등록 PNG는 지도 합성, 네이버 콘텐츠, Apple 자산 세 개다. 치수, 전체 바이트 수와 SHA-256은 [자산 매니페스트](assets-manifest.json)에 있다. Figma 등록 시 각 실제 노드의 이미지 해시, 같은 종횡비, 불투명도 100% 및 필터·회전·이미지 크롭 미적용을 확인한다.

이 시안은 승인된 원본의 32px 모서리, 흰 네이버, 다크 지도 위 얇은 테두리의 검정 Apple 조합을 사용한다. 배포 구현에서는 카카오의 공식 12px 가이드, 유색 제공자와 병행하는 네이버의 녹색 권고, 어두운 배경의 Apple 흰 시스템 스타일 권고를 별도로 확인한다. [확인된 브랜드 정책 차이](../02-research/recommendations.md)
