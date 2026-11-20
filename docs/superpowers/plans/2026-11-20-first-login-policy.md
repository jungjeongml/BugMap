# 첫 로그인 정책 링크 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 첫 로그인에서 이용약관과 개인정보처리방침을 각각 밑줄 링크로 열 수 있게 한다.

**Architecture:** Figma 05에는 두 개의 문서 링크를 배치한다. Expo 앱은 게시 URL이 있으면 기기의 기본 브라우저로 열고, 게시 전에는 선택한 문서 제목과 준비 상태를 표시한다.

**Tech Stack:** Figma 데스크톱 Cursor MCP, Expo·React Native·TypeScript, Node test runner.

**Spec:** [첫 로그인 및 Mapbox 배경 설계](../specs/2026-11-20-first-login-mapbox-design.md)

## Global Constraints

- 링크 명칭은 `이용약관`과 `개인정보처리방침`이다. 둘 다 밑줄과 최소 44pt의 조작 영역을 사용한다.
- 게시된 정책 문서 주소는 아직 없다. 두 주소는 빌드 환경에서 각각 설정한다. 인증에 별도 약관 확인 화면을 삽입하지 않는다.
- 현재 작업은 화면과 정책 링크에 적용한다. 실 서비스의 인증 연결 및 Mapbox 스냅샷은 위 설계의 후속 작업이다.

## Review Focus

- 주소가 없는 상태와 브라우저가 URL을 열지 못한 상태에 서로 다른 메시지를 표시한다.
- 두 링크가 각각 다른 문서 식별자로 전달되는지 확인한다.
- URL 설정에 HTTPS 공개 문서 주소만 사용하고, 사용자 입력에서 URL을 읽지 않는다.

### Task 1: Figma 링크

- [x] BugMapHarness 05 하단에 링크 두 개를 배치한다.
- [x] 390×844 캡처와 노드에서 라벨·밑줄·조작 영역을 확인한다.

### Task 2: 앱 정책 링크

**Files:** `src/features/auth/LoginScreen.tsx`, `src/features/auth/PolicyLinks.tsx`, `src/features/auth/policyDocuments.ts`, `.env.example`, 정책 문서 열기 테스트.

- [x] 테스트에서 문서별 URL, 미설정, 잘못된 URL 및 브라우저 실패를 재현하고 실패를 확인한다.
- [x] 두 링크를 각각 구성하고 `EXPO_PUBLIC_BUGMAP_TERMS_URL`과 `EXPO_PUBLIC_BUGMAP_PRIVACY_URL`을 사용한다. 주소가 없으면 선택한 문서에 대해 `문서 게시를 준비 중입니다.`를 표시한다.
- [x] Expo 타입 검사, 정책 테스트, 웹 번들 및 클릭 동작을 확인한다.
