# BugMap 05 Figma 데스크톱 CLI

실제 제작은 BugMapHaness Page 1의 업데이트된 개발용 **Cursor MCP Plugin**으로 수행했다. 마지막 확인 채널은 `o5pf3rim`이다. 준비했던 별도 `BugMap 05 CLI`는 이 제작에 사용하지 않았다.

`prepare.mjs`는 저장소의 디자인 시스템 승인과 등록 자산·벡터·텍스트 좌표를 바탕으로 제작 전용 플러그인 소스를 만든다. `draw.mjs`는 승인된 시안 해시와 Figma 문서명·페이지·기존 지도 노드를 일치시킨 뒤 한 프레임을 만든다. 이미 만든 프레임은 캡처와 트리만 다시 내보낸다.

```sh
cd /Users/mac/Documents/BugMap
node work/bugmap-login-map-harness/06-figma/cli/draw.mjs "$PWD" o5pf3rim status
node work/bugmap-login-map-harness/06-figma/cli/draw.mjs "$PWD" o5pf3rim draw
```

실행 환경은 Node.js 22+, 로컬 포트 3055의 TalkToFigma 릴레이, Figma 데스크톱 플러그인이다. 채널이 다시 연결되면 명령의 채널 인자를 바꾼다. `repair-remote.mjs`와 `repair-original-artwork.json`은 실제 생성된 `19:2`의 잘린 SVG 외곽과 내부 벡터 위치를 바로잡은 명령과 제작 전 좌표 기록이다.

원격 파일 키를 받을 수 없는 상태는 `remoteFileKey`의 null로 기록했다. 승인된 링크 키는 하네스 대상 필드에 사용하고, CLI는 실제 문서명·페이지 ID·기존 지도 노드로 검증했다. [실제 제작 기록](../change-log.md)
