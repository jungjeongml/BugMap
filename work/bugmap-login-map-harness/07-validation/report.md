# 05 첫 로그인 검증

2026-11-19. 대상은 BugMapHaness Page 1의 기본 상태 `login/default` 한 장이다. [Figma 19:2](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHaness?node-id=19-2) · [실제 Figma 캡처](../06-figma/captures/login-default.png) · [제작 기록](../06-figma/change-log.md)

## 결과

- Node.js CLI로 Figma 데스크톱에 쓰고, 같은 CLI에서 390×844 PNG와 노드를 다시 내보냈다. PNG와 승인 시안을 직접 열어 로고·지도 상하 페이드·세 소셜 로그인 버튼·약관·정적 안전 영역을 대조했다. 배경 없이 #C5EE79로 그린 로고는 13개 벡터를 갖는다. 본문 10개는 텍스트이며 소개와 소셜 묶음은 세로 오토레이아웃이다. 세 버튼은 358×48px, 모서리 설정 32px, 간격 12px이다.
- `lint:figma`는 74개 노드와 PNG 매핑 3개를 검사했고 이슈 0건이다. Figma의 세 이미지 해시는 등록 PNG 바이트의 SHA-1에 일치한다. [Figma 검사](figma-lint.json) · [노드](../06-figma/nodes.json) · [이미지 매핑](../06-figma/node-map.json)
- `lint:web`는 로컬 검증 HTML 한 장을 390×844로 렌더했고 이슈 0건이다. 승인 PNG와 HTML 캡처는 해시와 픽셀이 일치한다. 이 브라우저 렌더는 로컬 검증용이며 Figma 프레임 제작은 CLI로 수행했다. [웹 검사](web-lint.json) · [HTML 검증 캡처](captures/924b1769cb10-390x844.png)
- 실제 Figma PNG와 승인 PNG는 같은 구성으로 보인다. 서로 다른 네이티브 렌더러와 글자 배치에서 RGB 채널 차이가 16을 넘는 픽셀이 13,345개(4.05%)다. 실제 Figma의 제목·부제·약관은 SVG보다 조금 좁고, 문구·중앙 정렬·읽기 순서는 유지된다. 화면의 안전 영역과 잘림은 실제 Figma PNG에서 육안으로 확인했다. 지도 위 한강 라벨의 대비는 등록 배경 픽셀과 노드 전경색을 대조한 독립 검수에서 최소 4.57:1이었다. HTML의 픽셀 일치 결과는 별도의 로컬 산출물에 대한 것이다.
- 대상의 기존 지도 7:2는 PRD 시점·제작 직전·최종 노드 SHA-256이 모두 일치한다. 원본 BugMap 파일에 쓰기 요청을 보내지 않았다. 원본 05는 제작 전후 `get_node_info` 응답 해시, 레이어 102개의 ID와 유형, 390×844 PNG의 바이트가 모두 일치한다. 새 채널은 `get_node_tree`를 지원하지 않아 원시 트리 속성 전체는 재비교 범위에서 빠졌다. [보존 검증](../06-figma/preservation.json) · [원본 비교 근거](../06-figma/preservation/source-compatible-report.json)

[요구사항별 결과](coverage.csv) · [검토 이슈](issues.csv)

검증 대상은 정적 디자인이다. 실제 소셜 로그인·인증, 스크린리더, 기기별 반응형은 실행하지 않았다. 최종 검수 점수와 승인은 사람이 하네스 CLI로 직접 기록한다.
