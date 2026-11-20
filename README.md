# 곤충맵

BugMap은 React Native와 Expo로 만드는 곤충 발견 기록 앱입니다. 현재 앱의 시작 화면과 카카오·Google·iOS Apple 로그인, 개발용 인증 서버가 구현되어 있습니다.

## 실행

Node.js 22.13 이상과 npm을 사용합니다.

```sh
npm install
npx expo install --check
npm run web
```

기기나 Expo Go에서는 `npm start`, 시뮬레이터는 `npm run ios`, Android 에뮬레이터는 `npm run android`를 사용합니다. 네이티브 실행에는 각 플랫폼 개발 환경이 필요합니다.

```sh
npm run typecheck
npm run export:web
```

의존성은 설치되어 있으며 lockfile에 기록되어 있습니다. 2026-11-09에 타입 검사·웹 번들·Expo 의존성 검사(오프라인 로컬 호환성 표 기준)가 통과했습니다. `react-native-svg`는 Expo 권장 버전 15.16.0입니다. [구현 화면 캡처](design/login/implementation.png)에서 모바일 레이아웃과 Lucide SVG 렌더링을 확인했고, 개발 모드에서 앱 콘솔 오류가 없음을 확인했습니다. 실제 기기 검증은 미완료입니다.

## 파일 구성

- `docs/DESIGN.md`: 공통 디자인 지침과 토큰.
- `docs/screens/`: 메인 지도·기록 작성·로그인 화면 명세.
- `docs/design-harness.md`: AI 디자인 플러그인의 단계·산출물·승인 설계.
- `tools/design-harness/`: Node 20+ 독립 CLI. [사용법과 승인 계약](tools/design-harness/README.md).

- `App.tsx`, `index.ts`: 앱 진입점, 상태바·안전 영역 설정.
- `src/features/auth/`: 시작 화면, 정책 링크, 소셜 인증과 기기 세션 복구.
- `server/`: NestJS 개발용 인증 서버와 SQLite 저장소.
- `src/features/auth/AppIcon.tsx`: Lucide 아이콘 이름과 화면 사용 위치 연결.
- `src/theme/tokens.ts`: 선택 화면의 색상·치수.
- `design/login/reference/2:2.png`: 배경을 포함한 **Figma 참조 캡처**. 앱 실행 결과가 아닙니다.

## 소셜 로그인 개발 환경

1. 개발용 인증 서버의 공개 HTTPS 주소와 사용할 제공자 설정을 준비한다. [서버 실행 및 제공자 등록](server/README.md)
2. 루트 환경 파일의 `EXPO_PUBLIC_BUGMAP_AUTH_API_URL`에 서버의 HTTPS origin을 넣는다. [앱 환경 변수 예시](.env.example)
3. `npx expo run:ios` 또는 `npx expo run:android`로 네이티브 앱을 빌드한다. 웹과 Expo Go에서는 로그인 화면과 정책 링크를 미리 볼 수 있다.

첫 화면은 BugMapHarness 05를 기준으로 다크 지도와 소셜 로그인 버튼을 표시한다. 기본 지도는 시안의 일러스트다. `EXPO_PUBLIC_BUGMAP_MAPBOX_TOKEN`에 Mapbox 공개 토큰을 설정하면 서울숲의 정적 지도와 로고·출처 링크가 표시된다. [첫 로그인 화면 명세](docs/screens/login.md)

이용약관과 개인정보처리방침은 각각 게시 전 안내를 표시한다. 주소 설정 후 두 링크가 각자 문서를 연다. 로그인 성공 후 앱에서 세션 상태와 로그아웃을 확인할 수 있다. 실제 발견 지도 화면은 별도 구현 범위다.

Expo 버전 조합은 [SDK 호환 표](https://docs.expo.dev/versions/latest/)와 [SDK 58 TypeScript 템플릿](https://github.com/expo/expo/blob/sdk-58/templates/expo-template-blank-typescript/package.json), 안전 영역은 [공식 문서](https://docs.expo.dev/versions/latest/sdk/safe-area-context/)를 기준으로 작성했습니다. 실제 설치 호환성은 아직 확인하지 못했습니다.

UI 아이콘은 Figma에서 복사하지 않고 [Lucide 아이콘](https://lucide.dev/icons)을 `lucide-react-native` 컴포넌트로 사용합니다. React Native 렌더링은 `react-native-svg`에 의존합니다.

## 디자인 하네스 CLI

하네스만 실행할 때는 Node 20 이상이면 되고 `npm install`이 필요하지 않습니다. 앱의 Node 22.13 이상 요구사항은 그대로입니다.

```sh
npm run design-harness -- check --project bugmap
npm run design-harness -- approve prd --by "검토자 이름" --project bugmap
npm test
```

`refs:capture`·`wireframe`·`design-md`·`lint:web`·`review`·`handoff`로 캡처·생성·검사·사람 검토·전달 문서를 준비합니다. 실제 브라우저 명령은 설치된 Chromium을 사용합니다. `check`는 `work/<프로젝트>/`의 현재 단계와 누락·오래된 결과·검사 실패를 출력합니다. 승인한 파일이나 상위 입력이 바뀌면 승인은 유효하지 않게 됩니다. 아직 산출물을 작성하지 않은 프로젝트는 첫 단계의 누락 목록을 출력하고 종료 코드 1을 반환합니다. 실제 디자인 품질·Figma 검증은 별도로 수행해야 합니다.


## 단계별 디자인 에이전트

프로젝트에는 [design-flow](.agents/skills/design-flow/SKILL.md)와 리서치·구조/와이어프레임·시스템·Figma·새 맥락 비평가가 등록돼 있습니다. [담당·경로·승인 절차](docs/design-agents.md)를 참고합니다.

```text
$design-flow로 project=bugmap의 현재 상태를 확인하고 다음 사람 승인 지점까지 진행해 줘.
```

사람 승인 지점에서 흐름을 끝내고, `approve`와 사람 점수용 `review`는 사람이 직접 실행합니다. 채팅의 승인 의사를 에이전트가 대신 CLI에 기록하지 않습니다. 실제 하네스 실행은 위 호출로 시작하며, 에이전트·스킬 추가 자체가 단계 승인은 아닙니다.
