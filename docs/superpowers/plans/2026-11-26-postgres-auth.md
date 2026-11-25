# PostgreSQL 인증 저장소 전환

- 로컬 Compose에 PostgreSQL 17과 PostGIS를 구성한다. Expo·NestJS는 Mac에서 실행한다.
- Prisma 7로 인증 저장소를 옮긴다. 기존 HTTP 계약, ASCII 대소문자 무시 닉네임 고유성, 일회용 코드와 세션 회전의 동시성 보장을 검증한다.
- 기존 SQLite는 읽기 전용으로 유지한다. 신규 PostgreSQL에 계정·소셜 연결·닉네임을 옮기고 토큰은 새 로그인에서 발급한다.
- PostgreSQL 마이그레이션, 인증 회귀 테스트, 웹 설정과 운영 절차를 검증한다.
