# 메인 발견 지도 웹 검증

`main-map--default.html`은 승인된 390×844 기본 화면을 Chromium에서 검증하기 위한 정적 시안이다. [승인 SVG](../../05-design-system/preview.svg)의 지도 레이블, 총건수 배지, 현재 위치, 지도 출처, GPS·기록 버튼, 손잡이, 검색 필드, 하단 탭을 개별 SVG 요소와 텍스트로 유지했다. [승인 문구](../../05-design-system/copy.json)와 [토큰](../../05-design-system/tokens.json)을 사용한다.

배경 지도·Mapbox 로고와 Pretendard 500·700은 승인 원본을 로컬 자산으로 연결했다. Lucide 도형은 승인 SVG와 동일하며 산출물의 라이선스는 `assets/`에 있다. [자산 출처](../../05-design-system/asset-sources.md)

조작 영역에는 승인된 역할과 이름이 있다. `lint:web`은 버튼 역할의 영역을 검사한다. 별도 Chromium DOM 대조는 검색과 탭을 포함한 12개 영역의 위치·크기·역할·이름, 지도 탭의 선택 상태를 승인 기준과 비교한다. 레이블이 배경 지도 위에 놓이는 조합의 대비는 [승인 렌더 보고서](../../05-design-system/render-report.json)의 직접 측정을 참조한다.

이 시안의 검증 범위는 첫 화면의 배치와 표시 상태다. GPS, 지도 확대, 패널 드래그, 검색과 탭 이동의 실제 동작 및 Figma의 레이어·편집성은 구현 또는 원격 검증 범위다.
