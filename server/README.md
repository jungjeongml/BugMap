# BugMap 개발 인증 서버

Node.js 22.13 이상에서 실행한다. NestJS 서버가 제공자 콜백을 받고 SQLite에 계정과 세션을 저장한다.

```sh
cd server
npm ci
cp .env.example .env
npm start
```

`.env`에서 `AUTH_PUBLIC_ORIGIN`에 기기가 접속할 수 있는 HTTPS 도메인을 넣고, 사용할 제공자의 설정을 채운다. 사용하지 않는 제공자는 해당 변수 그룹 전체를 비워 둔다. 서버는 기본적으로 `127.0.0.1:3000`에서 수신한다. HTTPS 리버스 프록시가 이 포트로 요청을 전달하도록 설정하고, 앱의 `EXPO_PUBLIC_BUGMAP_AUTH_API_URL`에는 같은 HTTPS origin을 넣는다. Apple 콜백에는 localhost나 IP 주소 대신 공개 도메인이 필요하다. 프록시 요청 로그에는 인증 URL의 쿼리, 요청 본문, 인증 헤더·쿠키를 남기지 않는다.

## 인증 제공자 등록 전 HTTPS 확인

개발 서버 주소를 먼저 등록해야 할 때는 `.env`의 `AUTH_ALLOW_UNCONFIGURED=true`를 사용한다. 제공자가 준비되기 전에도 `GET /healthz`가 HTTP 200과 `authentication: unconfigured`를 반환한다. 각각의 로그인 요청은 앱으로 돌아가 제공 준비 상태를 알린다. 등록을 마친 제공자의 값을 넣고 인증 서버만 다시 시작하면 같은 콜백 주소를 쓸 수 있다. 기본값은 제공자를 하나 이상 설정해야 서버가 시작된다.

Cloudflare Quick Tunnel을 사용한 테스트 주소는 터널 프로세스가 살아 있는 동안 유지된다. 테스트 중에는 Mac과 터널을 켜 둔다. 새 주소가 나오는 경우 서버의 `AUTH_PUBLIC_ORIGIN`, 앱의 `EXPO_PUBLIC_BUGMAP_AUTH_API_URL`, 콘솔에 등록한 콜백을 함께 바꾼다. [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

## 제공자 설정

| 제공자 | 등록 | HTTPS 콜백 경로 |
| --- | --- | --- |
| Kakao | Kakao Login을 활성화하고 REST API 키와 Client Secret을 등록한다. REST API 키 설정에 콜백 URL을 추가한다. | `/v1/auth/callback/kakao` |
| Google | Google Auth Platform에서 Web application OAuth 클라이언트를 만들고 Authorized redirect URIs에 콜백 URL을 추가한다. 개발 프로젝트는 Testing 상태로 유지할 수 있다. 현재 앱은 `openid`만 요청한다. | `/v1/auth/callback/google` |
| Apple | Sign in with Apple을 활성화한 기본 App ID에 Services ID를 연결한다. Domains and Subdomains와 Return URLs를 등록하고 Sign in with Apple 키를 만든다. | `/v1/auth/callback/apple` |

콘솔에서 발급한 비밀값은 로컬 `server/.env`에 저장한다. 이 파일은 Git에서 제외한다. Apple의 `.p8`는 발급 직후 다운로드해 보관한다.

등록할 전체 URL은 `AUTH_PUBLIC_ORIGIN`과 표의 콜백 경로를 합친 값이다. Apple 키의 PKCS#8 PEM을 한 줄로 입력할 경우 `.env`의 `APPLE_PRIVATE_KEY`에 작은따옴표로 감싸서 넣고 각 줄바꿈을 리터럴 `\n`으로 표기한다. 제공자 비밀값은 서버 환경에만 저장한다.

## 웹 로그인

`AUTH_WEB_ORIGIN`을 지정하면 카카오·Google 웹 인증을 사용할 수 있다. Expo 개발 서버는 `http://localhost:8081`을 사용하고 앱 환경의 `EXPO_PUBLIC_BUGMAP_WEB_AUTH_ORIGIN`에도 같은 값을 넣는다. 브라우저 주소의 호스트와 포트까지 일치해야 한다. 제공자 콘솔에는 위 표의 공개 HTTPS 서버 콜백을 등록한다.

브라우저는 공개 인증 서버의 `/v1/auth/web/authorize/:provider`에서 로그인을 시작한다. 서버가 제공자 콜백을 확인하고 웹 앱으로 돌려보내면, 웹 앱은 동일 출처의 `/v1/auth/web/exchange`에서 일회용 코드를 교환한다. 쿠키 세션은 `/v1/auth/web/session`으로 조회하고 `/v1/auth/web/logout`으로 폐기한다.

닉네임 저장에는 동일 출처의 `POST /v1/auth/web/nickname`을 사용한다. 웹 프록시는 이 경로도 원래 요청의 쿠키와 Origin 헤더를 유지해 인증 서버에 전달해야 한다. 모바일은 Bearer 인증으로 `POST /v1/auth/nickname`을 호출한다.

Expo의 Metro 개발 서버는 이 네 API를 로컬 인증 서버로 전달한다. 앱 환경의 `BUGMAP_WEB_AUTH_LOCAL_PORT`는 인증 서버의 `PORT`가 3000과 다를 때 사용한다. 웹을 배포할 때는 앱과 동일한 HTTPS 호스트에서 이 네 API를 인증 서버로 전달하도록 리버스 프록시를 구성한다.

[Kakao Login REST API](https://developers.kakao.com/docs/en/kakaologin/rest-api) · [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect) · [Apple 웹 로그인 설정](https://developer.apple.com/documentation/signinwithapple/configuring-your-webpage-for-sign-in-with-apple) · [Apple 토큰 교환](https://developer.apple.com/documentation/SigninwithAppleRESTAPI/Generate-and-validate-tokens)

## 세션과 검증

- 제공자 state는 10분 동안 유효하며 시작 브라우저의 보안 쿠키에 연결된다. Google과 Kakao에는 서버가 별도의 S256 PKCE를 사용한다. Apple은 `form_post`로 콜백하며 서명된 클라이언트 JWT를 사용한다.
- 앱으로 돌아가는 1회용 코드는 60초 동안 유효하다. 서버는 교환할 때 앱 콜백 주소, 제공자, S256 검증값을 확인한다. Google과 Apple은 검증된 `sub`를, Kakao는 인증된 사용자 조회의 `id`를 사용한다.
- 액세스 토큰은 15분, 갱신 세션은 처음 로그인부터 최대 30일 동안 유효하다. 서버는 토큰 해시를 저장한다. 갱신 시 두 토큰을 모두 회전시키며, 로그아웃하면 해당 세션의 액세스와 갱신을 폐기한다. 갱신 응답을 잃어버린 앱은 이전 토큰으로 같은 세션을 로그아웃할 수 있다. 액세스 토큰은 `GET /v1/auth/me`에 Bearer 헤더로 전달해 확인할 수 있다.
- `npm test`는 로컬 HTTP 경로와 SQLite를 실행하고 제공자 응답은 테스트에서 주입한다. `npm run typecheck`로 서버 타입을 검사한다. 제공자 앱 등록 후 기기에서 HTTPS 로그인, 취소, 재실행 후 세션 복구, 로그아웃을 검증한다.
