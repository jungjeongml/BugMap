# 자산 출처·보존 범위

2026-11-16 재사용 검토. 이번 단계에서 새 원격 조회나 다운로드를 수행하지 않았다. 기존 `work/bugmap-login/05-design-system/asset-sources.md`의2026-11-13 확인 기록과 원본을 읽고 재사용했다. 현재 지침의 최신성은 별도 미검증이다.

- **BugMap**: 현재 페이지126:706 `BugMap-logo-vector`에서 이전 조정자가 실제 Cursor CLI로 조회한 `../control/logo.png`를 미리보기 전용으로 바이트 그대로 복사했다. 원본1000×310, 표시216×66.96,100:31 비율이다. Canvas 픽셀 관찰에서 불투명 주요 색은 `#107B34`이며 앱 일반 primary `#15803D`로 덮어쓰지 않았다. Figma 제작에서는 이 PNG 대신 지정 원본 벡터를 복제한다. 이 로고는 사용자 명시 재사용 요청이며 일반 UI 아이콘 추출과 다르다.
- **카카오**: 기존 공식 자산 `Kakao Login/SVG/kakao_login_kr_medium.svg`를 `assets/kakao-login.svg`에 원본 그대로 복사했다. [공식 가이드](https://developers.kakao.com/docs/ko/kakaologin/design-guide), [공식 리소스 안내](https://developers.kakao.com/tool/resource/login). 사용자 제공 파일의 개별 다운로드 시각/최종URL은 과거에도 미확인이었다. 원본224×46을292.173913×60으로 균등 확대하고 노란 빈 컨테이너만358×60으로 확장했다. 원본심볼·레이블·색 유지. 원본rx8의 확대값10.434783을 적용한다.
- **네이버**: 기존 `NAVER_login_Light_KR_white_center_H48.png`를 `assets/naver-login.png`에 원본 그대로 복사했다. [공식 가이드](https://developers.naver.com/docs/login/bi/bi.md), [가이드의 PNG링크](https://developers.naver.com/inc/devcenter/downloads/bi/NAVER_login_KR.zip). 원본1472×192를358×46.695652로 균등 축소해358×60 터치컨테이너 중앙에 둔다. 이번에는 원본의 빈 테두리도 자르지 않는다. 이미지 자체 높이는46.7px이며 조작영역60px과 구분한다. 공식 N색#03A94D·검은 레이블·흰 면·테두리색#D9D9D9는 실제 픽셀로 확인했다.
- **Apple**: 이전 공식 API 다운로드 `apple-signin-ko-black-358x48@2x.png`를 `assets/apple-login.png`에 그대로 복사했다. [원본 생성 URL](https://appleid.cdn-apple.com/appleid/button?height=48&width=358&color=black&border=false&type=sign-in&border_radius=8&scale=2&locale=ko_KR). 원본716×96→358×48을358×60 검은 터치컨테이너 중앙에 둔다. 공식 한국어 레이블 “Apple로 로그인”과 표식을 임의 재제작하지 않았다.
- **개념 지도**: `build.mjs`가 자체 작성 도로·공원·물길의 정적SVG를 생성한다. 실제 지명·기록·위치·수치나 지도제공자 데이터가 아니며 Kyro 이미지 픽셀을 재사용하지 않는다. 장식 MapPin은 기존 프로젝트 Lucide MapPin geometry를 따른다. 카탈로그 https://lucide.dev/icons/map-pin, 라이선스 `assets/lucide-license.txt`. 실제 앱에서는 프로젝트 Lucide 컴포넌트를 사용한다.

PNG 원본 SHA-256·치수는 `preview-assets.json`을 따른다. `assets-manifest.json`은 후속 Figma에서 이미지로 사용하는 네이버·Apple PNG만 등록한다. 로고PNG는 로컬 미리보기 전용이므로 Figma 이미지 매핑 대상으로 등록하지 않았다. 카카오SVG와 개념지도는 후속에서 편집 가능한 벡터/레이어로 구성해야 한다.
