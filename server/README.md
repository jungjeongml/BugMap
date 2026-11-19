# BugMap 개발 인증 서버

Node.js 22.13 이상에서 실행한다. NestJS 서버가 제공자 콜백을 받고 SQLite에 계정과 세션을 저장한다.

```sh
cd server
npm ci
cp .env.example .env
npm start
```

`.env`에서 `AUTH_PUBLIC_ORIGIN`에 기기가 접속할 수 있는 HTTPS 도메인을 넣고, 사용할 제공자의 설정을 채운다. 사용하지 않는 제공자는 해당 변수 그룹 전체를 비워 둔다. 서버는 기본적으로 `127.0.0.1:3000`에서 수신한다. HTTPS 리버스 프록시가 이 포트로 요청을 전달하도록 설정하고, 앱의 `EXPO_PUBLIC_BUGMAP_AUTH_API_URL`에는 같은 HTTPS origin을 넣는다. Apple 콜백에는 localhost나 IP 주소 대신 공개 도메인이 필요하다. 프록시 요청 로그에는 인증 URL의 쿼리, 요청 본문, 인증 헤더·쿠키를 남기지 않는다.

## 제공자 설정

| 제공자 | 등록 | HTTPS 콜백 경로 |
| --- | --- | --- |
| Kakao | Kakao Login을 활성화하고 REST API 키와 Client Secret을 등록한다. REST API 키 설정에 콜백 URL을 추가한다. | `/v1/auth/callback/kakao` |
| Google | Google Auth Platform에서 Web application OAuth 클라이언트를 만들고 Authorized redirect URIs에 콜백 URL을 추가한다. 테스트 상태라면 테스트 사용자를 추가한다. | `/v1/auth/callback/google` |
| Apple | Sign in with Apple을 활성화한 기본 App ID에 Services ID를 연결한다. Domains and Subdomains와 Return URLs를 등록하고 Sign in with Apple 키를 만든다. | `/v1/auth/callback/apple` |

등록할 전체 URL은 `AUTH_PUBLIC_ORIGIN`과 표의 콜백 경로를 합친 값이다. Apple 키의 PKCS#8 PEM을 한 줄로 입력할 경우 `.env`의 `APPLE_PRIVATE_KEY`에 작은따옴표로 감싸서 넣고 각 줄바꿈을 리터럴 `\n`으로 표기한다. 제공자 비밀값은 서버 환경에만 저장한다.

[Kakao Login REST API](https://developers.kakao.com/docs/en/kakaologin/rest-api) · [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect) · [Apple 웹 로그인 설정](https://developer.apple.com/documentation/signinwithapple/configuring-your-webpage-for-sign-in-with-apple) · [Apple 토큰 교환](https://developer.apple.com/documentation/SigninwithAppleRESTAPI/Generate-and-validate-tokens)

## 세션과 검증

- 제공자 state는 10분 동안 유효하며 시작 브라우저의 보안 쿠키에 연결된다. Google과 Kakao에는 서버가 별도의 S256 PKCE를 사용한다. Apple은 `form_post`로 콜백하며 서명된 클라이언트 JWT를 사용한다.
- 앱으로 돌아가는 1회용 코드는 60초 동안 유효하다. 서버는 교환할 때 앱 콜백 주소, 제공자, S256 검증값을 확인한다. Google과 Apple은 검증된 `sub`를, Kakao는 인증된 사용자 조회의 `id`를 사용한다.
- 액세스 토큰은 15분, 갱신 세션은 처음 로그인부터 최대 30일 동안 유효하다. 서버는 토큰 해시를 저장한다. 갱신 시 두 토큰을 모두 회전시키며, 로그아웃하면 해당 세션의 액세스와 갱신을 폐기한다. 갱신 응답을 잃어버린 앱은 이전 토큰으로 같은 세션을 로그아웃할 수 있다. 액세스 토큰은 `GET /v1/auth/me`에 Bearer 헤더로 전달해 확인할 수 있다.
- `npm test`는 로컬 HTTP 경로와 SQLite를 실행하고 제공자 응답은 테스트에서 주입한다. `npm run typecheck`로 서버 타입을 검사한다. 제공자 앱 등록 후 기기에서 HTTPS 로그인, 취소, 재실행 후 세션 복구, 로그아웃을 검증한다.
