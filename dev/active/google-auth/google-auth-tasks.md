# google-auth — 작업 체크리스트

**Last Updated**: 2026-08-27

## 1. DB 스키마 · RLS

- [x] `supabase/migrations/0001_profiles.sql` 작성
- [x] `public.profiles` 테이블 생성
- [x] `public.is_admin()` SECURITY DEFINER 함수 (search_path='')
- [x] `handle_new_user()` 트리거 — 가입 시 프로필 자동 생성
- [x] `profiles_protect_role` 트리거 — 자가 권한 상승 차단
- [x] `profiles_set_updated_at` 트리거
- [x] RLS 활성화 + 정책 4종
- [x] Management API로 적용

### 1-A. SQL 검증

- [x] 익명 조회 → 0행
- [x] 일반 사용자 자가 `role` 승격 시도 → `user` 유지
- [x] 일반 사용자 타인 행 수정 시도 → 변조 없음
- [x] 관리자 → 전체 행 조회 가능
- [x] `is_admin()` 재귀 없이 `true` 반환
- [x] 관리자의 타인 권한 변경 → 반영됨

## 2. 공용 JS 모듈

- [x] `js/config.js`
- [x] `js/supabase-client.js`
- [x] `js/auth.js`
- [x] `js/guard.js`
- [x] `js/ui.js` (계획에 없던 공용 표시 헬퍼. 세 화면의 중복 제거)

## 3. 스타일

- [x] `css/auth.css`
- [x] `styles.css` 미수정 확인

## 4. 로그인

- [x] `login.html`
- [x] `js/login.js`
- [x] `auth-callback.html`
- [x] `js/auth-callback.js`

## 5. 온보딩 (회원가입)

- [x] `welcome.html`
- [x] `js/welcome.js`
- [x] 완료 시 `onboarding_completed`, `terms_accepted_at` 기록

## 6. 마이페이지

- [x] `mypage.html`
- [x] `js/mypage.js` — 조회/수정/로그아웃

## 7. 관리자페이지

- [x] `admin.html`
- [x] `js/admin.js` — 목록/검색/권한 변경
- [x] 비관리자 접근 차단

## 8. 내비 연동

- [x] `js/nav-auth.js`
- [x] `index.html` 계정 항목 추가
- [x] 기존 메뉴 11개 · 검색 · 장바구니 보존 확인

## 9. 문서

- [x] `docs/google-oauth-setup.md`
- [x] `serve.json` (cleanUrls 비활성)

## 10. 구글 프로바이더 활성화 — 완료

- [x] `uri_allow_list` 에 `http://localhost:3000/**` 등록
- [x] 클라이언트 ID/시크릿 수령
- [x] Management API로 프로바이더 활성화 (`external_google_enabled: true`)
- [x] authorize 엔드포인트 → 구글 302 확인
- [x] 구글이 리디렉션 URI 수락 확인 (mismatch·invalid_client 없음)
- [x] 브라우저에서 버튼 클릭 → 구글 로그인 화면 도달

## 11. 브라우저 검증

구글 자격증명 없이 가능한 범위는 임시 계정으로 세션을 만들어 모두 검증함.

- [x] 비로그인 → mypage / admin / welcome 접근 차단
- [x] 온보딩 미완료 → welcome 강제 이동
- [x] 약관 미동의 시 가입 차단
- [x] 가입 완료 → mypage 이동
- [x] 프로필 수정 후 새로고침 시 값 유지
- [x] 비관리자의 admin.html 직접 접근 차단
- [x] 관리자 승격 후 전체 목록 노출
- [x] 관리자 권한 변경 · 검색 · 빈 상태
- [x] 본인 강등 방지 (본인 행 버튼 비활성)
- [x] 로그아웃 후 보호 페이지 차단
- [x] OAuth 취소 파라미터 → 로그인 화면에 사유 표시
- [x] OAuth 개시 (PKCE challenge · redirect_to 생성)
- [x] 구글 로그인 화면 도달 (client_id · redirect_uri 수락됨)
- [ ] **구글 계정으로 실제 로그인 완료** — 사용자 본인 계정 필요, 대신 수행 불가

## 발견하고 고친 결함

1. **최초 관리자 생성 불가**
   `protect_role_column` 트리거가 service_role·postgres 의 관리 작업까지 되돌려
   아무도 관리자가 될 수 없었다. `auth.uid()` 가 없는 경로는 통과시키도록 수정.
   (해당 경로는 RLS 정책이 이미 막고 있어 우회 통로가 되지 않는다.)

2. **일반 사용자에게 관리자페이지 버튼 노출**
   `.btn { display: inline-flex }` 가 브라우저 기본 `[hidden] { display: none }` 을
   덮어써 `el.hidden = true` 가 무력화됐다. `auth.css` 에 전역 `[hidden]` 규칙 추가.

3. **OAuth 인가 코드 유실**
   `serve` 의 cleanUrls 가 `/auth-callback.html?code=...` 를 301 하면서 쿼리를 버렸다.
   `serve.json` 으로 cleanUrls 비활성화.

## 12. 마무리

- [x] 테스트 계정 정리 (profiles 0행 확인)
- [ ] 액세스 토큰 재발급 (사용자)
