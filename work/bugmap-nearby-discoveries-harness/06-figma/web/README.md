# 내 주변 발견 웹 검증

`nearby-discoveries--default.html`과 `nearby-discoveries--radius-3km.html`은 390×844 시안을 Chromium에서 대조하기 위한 두 정적 화면이다. [전체 승인 SVG](../../05-design-system/preview.svg) · [3 km 이내 승인 SVG](../../05-design-system/preview-radius-3km.svg)

승인 SVG의 조작 영역, 텍스트·아이콘·사진 좌표, 선택 상태를 유지했다. 두 상태의 차이는 선택한 칩과 기록 수, 4.6 km 항목의 표시 여부다. 사진과 Pretendard는 승인된 자산과 같은 바이트를 로컬 파일로 연결했다. [시스템 토큰](../../05-design-system/tokens.json) · [정확한 문구](../../05-design-system/copy.json) · [사진 출처 및 라이선스](../../05-design-system/asset-sources.md)

웹 검사는 시각적 배치·토큰·표시 상태를 확인한다. 드래그와 거리 필터의 실제 이동은 Figma에서, 스크롤·GPS·검색 데이터 동작과 스크린 리더는 제품에서 확인한다.

Chromium의 SVG 글자 대비를 검사할 때는 각 텍스트의 SVG 잉크와 배경 도형에 사용한 색을 CSS 계산값에도 반영한다. 실제 픽셀에서의 대비는 디자인 시스템의 렌더 보고서에서 별도로 검증했다. [색과 대비 측정](../../05-design-system/render-report.json)
