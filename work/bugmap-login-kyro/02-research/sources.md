# 출처와 캡처 재사용 검토

**2026-11-16 재사용 검토, 2026-11-12 원본 캡처, 새 원격 조회 아님.** 원본 시각은 `2026-11-12T19:38:15.761Z`(한국 시각 11월13일)이다. 제공자 문서의 현재 최신성은 미검증이다. 현재 세션에서 네트워크로 본문을 다시 확인했다고 주장하지 않는다.

## 승인 입력과 검토 범위

착수 check: PRD passed, 승인 ID `b88ca595-cc84-492a-ad66-b4aa86b9fad9`, currentStage research. PRD와 요구사항은 변경하지 않았다. 입력 SHA-256은 `reuse-verification.json`의 inputs에 기록했다.

- PRD `4f5a5c7caad8f93938c2cd9490435063e37e8cd43b346769761ca07a554328b4`
- requirements.csv `d114548d4e31c14064f69064eba262691da40f0e0d40ae59d60b3ced0815a756`
- 사용자 참고 `example/kyroFirstPage.png`: `b7c841e4e2547113276a9fa890dfac619c8854012422d1323bcc8c870a6c44bb`
- 로고 미리보기 `../control/logo.png`: `a6155822cb8783f8106c810cda462fb190730eb8e39bc7f94a4c09d0b58de3f1`. 이는 조정자의 실제 Cursor MCP 조회 결과이며 본 담당이 새로 원격 조회한 것은 아니다. 제품 로고만 지정 재사용하며 일반 UI 아이콘 추출과 구분한다.

## 실제 직접 연 이미지

본 담당이 이미지 도구로 Kyro 원본·로고 미리보기·아래 공식 PNG 3개를 직접 열었다. 공식 자료는 기존 `work/bugmap-login/02-research/`에서 재사용했다. refs.json 바이트 일치, 입력 해시, PNG SHA-256와 치수를 검증한 뒤 복사했으며 captures.json의 at·inputs·outputs·references는 원본 그대로 보존했다. 재사용 검토 날짜를 원본 캡처 시각으로 바꾸지 않았다.

| 출처·선정 이유 | 원본 URL → 당시 최종 URL | 로컬 캡처·치수·SHA-256 |
|---|---|---|
| Kakao 공식 버튼 디자인 가이드: 고유 심볼과 한국어 레이블 | https://developers.kakao.com/docs/ko/kakaologin/design-guide#카카오-로그인-버튼 → 동일 URL의 percent-encoded fragment | captures/kakao-official.png · 1280×1800 · `32d51b7af3ae5d05a1fc4e48542db5e036f2c3cacfd8eeef75868424d1924e60` |
| Naver 공식 버튼 가이드: 고유 N 및 지정색·완성형 | https://developers.naver.com/docs/login/bi/bi.md → 동일 | captures/naver-official.png · 1280×1800 · `7058420b292812f1a443f7fa5bb8b5ec6b011c7c663cca1d785d65086e43bf0f` |
| Apple 공식 버튼 미리보기: 고유 표식과 표준 버튼 | https://appleid.apple.com/signinwithapple/button → https://account.apple.com/signinwithapple/button | captures/apple-official.png · 1280×4096 · `2ae30281f5a7856d12b6ab849f4d5f87e18139ce5d042970a771549e58e07b11` |

refs 입력 SHA-256: `da920c230fe7e6e5a95df5d95076e2d9a8b587f2e015790a3727a67d4e16982e`.

## 새 캡처 시도의 실패 기록

`node tools/design-harness/bin/design-harness refs:capture --project bugmap-login-kyro --json`은 기본 샌드박스에서 exit2 / `Chromium exited:`로 실패했다. 지침에 따라 같은 명령의 escalation을 요청했으나 도구 호출이 사용자 중단으로 끝났다. 중단 직후 프로세스의 생존 여부는 확인하지 못했다. 후속 디렉터리 확인에서는 refs.json만 있었으며 새 PNG/captures.json은 없었다. 따라서 실패 시도를 새 캡처 성공으로 표시하지 않고 기존 증거 재사용으로 전환했다. 새 브라우저/네트워크 조회는 더 수행하지 않았다.

## 한계

정적 이미지 관찰이며 인증·클릭·스크롤·반응형·한국어 Apple 렌더·대비 측정·최종 자산 다운로드는 검증하지 않았다. Apple 캡처의 상단 전역 메뉴 CSS는 일부 적용되지 않은 모양이며 본문 버튼 샘플만 관찰 근거로 사용한다. 과거 문서의 수치가 현재 규정임을 보장하지 않는다. 시스템 담당은 실제로 사용하는 공식 자산·조건·48px 렌더를 확인하고 현재 원격 확인이 안 되면 그 한계를 남겨야 한다.
