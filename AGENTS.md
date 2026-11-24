# 작업 규칙

- 프로젝트 목적·기능·범위는 `docs/PRD.md`를 참고한다.
- 디자인 작업은 공통 지침 `docs/DESIGN.md`와 해당 화면 명세 `docs/screens/`를 읽고 따른다. AI 디자인 하네스의 작업 절차는 `docs/design-harness.md`를 참고한다.
- BugMap 디자인 하네스로 제작하는 새 화면과 상태별 Figma 결과물은 Figma 데스크톱 앱의 [BugMapHarness 파일 · Page 1](https://www.figma.com/design/Dan8qlRM20XPkk7Mtd5riw/BugMapHarness?node-id=0-1)에 만든다.
- Figma 작업은 데스크톱 앱의 Cursor MCP Plugin과 Cursor Talk to Figma MCP 브리지를 우선 사용한다. 작업 전에 현재 연결의 파일·페이지·대상 프레임을 확인한다. 연결이 끊겼거나 필요한 기능이 없으면 제약과 대안을 알린다. 사용자가 작업별 대상이나 도구를 지정하면 해당 지시를 따른다.
- 디자인 하네스 실행·재개는 `.agents/skills/design-flow/SKILL.md`를 따른다. 승인·사람 리뷰 명령과 기록은 사람이 직접 수행하며 에이전트는 대행하지 않는다.
- UI 아이콘은 Figma에서 복사·내보내지 않고, [Lucide](https://lucide.dev/icons)에서 의미가 맞는 아이콘을 골라 프로젝트의 Lucide 컴포넌트로 사용한다.
- 기능 요청에서 배포까지는 [개발·배포 워크플로](docs/development-workflow.md)를 따른다. Planning → Coding → Testing → Review 순으로 작업하며 사람의 승인과 필수 CI 검사를 거친다.
- 기술 의사결정·구조·구현 설계는 `docs/TDD.md`를 읽고 따른다.
- 문서의 확정 사항과 권장안·미결정을 구분한다. 현재 사용자 지시를 우선하며, 중요한 충돌이나 누락은 알린다.
- 요청 범위에 집중하고 기존 사용자 작업을 임의로 덮어쓰지 않는다.
- 변경에 맞는 검증을 수행한다. 디자인은 캡처로 확인하고, 검증하지 못한 부분은 명시한다.
- 작업 완료 시 `memory/progress.md`에 날짜, 완료 내용, 산출물 경로·링크, 검증 결과, 남은 일을 간결하게 추가한다. 미완료를 완료로 기록하지 않는다.
- 작업 결과로 요구사항·디자인 기준·기술 결정이 바뀌면 해당 기준 문서도 갱신한다.
- 이 파일은 공통 규칙만 간결하게 유지하고, 상세 설명과 작업 이력은 위 문서에 둔다.
