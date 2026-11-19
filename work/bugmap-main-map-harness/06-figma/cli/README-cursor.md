# Cursor MCP로 만든 07 메인 지도

이 폴더는 기존 Cursor MCP Plugin에서 실제 사용한 네이티브 제작·캡처 명령의 소스다. 기존 플러그인의 소스는 작업 뒤 바이트 일치까지 확인해 복원했다. 프로젝트 승인 UUID와 대상 페이지, 기존 두 프레임, 시각 원본 해시를 `prepare.mjs`와 `draw.mjs`가 대조한다.

`plugin.js`가 프레임 제작·내보내기·보정 구현이고 `plan.json`이 승인 데이터다. 버전 `088f5772f693dc3235b33959f084ac5a86cd1db38e9829564837bbef13b2c438`을 기존 Cursor MCP 명령 라우터에 일시적으로 연결해 채널 `bm7map26`에서 실행했다. 동작 중인 코드와 기존 채널이 연결된 상태에서 `draw.mjs`는 `status`, `draw`, `repair`, `export`를 지원한다. `repair`는 이번 생성 루트 `41:81`만 처리한다.

[실제 변경 기록](../change-log.md) · [최종 캡처](../captures/main-map-default.png)
