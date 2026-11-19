# 메인 지도 시안의 자산

| 자산 | 출처와 적용 |
|---|---|
| 다크 지도 | 저장소의 [지도 원본 벡터](../../../design/main-map/map-background.svg)에 다크 팔레트를 적용했다. 지형·도로·수면의 도형과 좌표는 원본을 사용한다. [시안용 지도](assets/map-dark.svg) |
| Mapbox 로고 | 공식 GL JS 저장소의 88×23 SVG를 바이트와 종횡비 그대로 사용한다. 실제 제품은 지도 SDK의 로고와 출처 정보 버튼을 사용한다. [로고 원본](https://raw.githubusercontent.com/mapbox/mapbox-gl-js/main/src/css/svg/mapboxgl-ctrl-logo.svg) · [SDK 출처 표시 가이드](https://docs.mapbox.com/help/dive-deeper/attribution/) |
| UI 아이콘 | 프로젝트에 설치된 `lucide-react-native` 1.70.0의 24×24 아이콘 도형을 사용한다. 8종의 역할은 아이콘 표에 기록했다. [아이콘 표](icons.csv) · [패키지 라이선스](assets/lucide-ISC.txt) |
| 글꼴 | Pretendard 1.3.9의 Medium 500과 Bold 700 원본 웹폰트를 시안 SVG에 넣었다. Figma 제작에서는 같은 이름과 웨이트의 글꼴을 연결한다. [공식 릴리스](https://github.com/orioncactus/pretendard/releases/tag/v1.3.9) · [원본 Medium](https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2/Pretendard-Medium.woff2) · [원본 Bold](https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2/Pretendard-Bold.woff2) · [SIL 오픈 폰트 라이선스](assets/pretendard-OFL.txt) |

바이트 수, 해시와 지도 원본 정보는 [자산 목록](assets-manifest.json)에 있다. 지도 지형은 제품 설계를 위한 모식도다. 지역명, 위치점과 공개 기록 건수는 시연 값이다.
