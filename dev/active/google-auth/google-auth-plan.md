# 구글 인증 · 마이페이지 · 관리자페이지 설계

- 작성일: 2026-08-27
- 대상: `D:\antigravity\mywebsite` (Apple 클론 정적 사이트)
- Supabase 프로젝트: `mywebsite_test` (`swtmrbfkiwzixottysbv`, ap-northeast-2)

## 1. 목표

정적 사이트에 인증을 붙여 다음 세 가지를 제공한다.

1. 구글 계정으로 로그인
2. 첫 로그인 시 가입 절차(온보딩)
3. 마이페이지(본인 정보) / 관리자페이지(전체 회원 관리)

## 2. 결정 사항과 근거

| 항목 | 결정 | 근거 |
|---|---|---|
| 사이트 구조 | 정적 유지, supabase-js CDN | 기존 코드 보존, 빌드 도구 불필요 |
| 인증 수단 | 구글 OAuth 전용 | 사용자 요청. 비밀번호 관리 부담 제거 |
| 관리자 판별 | `profiles.role` 컬럼 | 코드 수정 없이 관리자 증감 가능 |
| 실행 환경 | 로컬 `http://localhost:3000` | Supabase `site_url`과 이미 일치 |
| 가입 형태 | 첫 로그인 시 온보딩 단계 | 가입과 로그인을 체감상 구분 |

### 제외한 것 (YAGNI)

- 이메일/비밀번호 가입 — 사용자가 명시적으로 제외
- 회원 탈퇴, 프로필 사진 업로드, 관리자 감사 로그 — 요청 범위 밖

## 3. 데이터 모델

`auth.users`는 Supabase 관리 영역이므로 변경하지 않는다. `public.profiles` 하나만 추가한다.

| 컬럼 | 타입 | 기본값 | 비고 |
|---|---|---|---|
| `id` | uuid PK | | `auth.users(id)` FK, on delete cascade |
| `email` | text | | 구글 계정 이메일 |
| `full_name` | text | | 구글 제공 이름 |
| `display_name` | text | | 온보딩에서 사용자가 정함 |
| `avatar_url` | text | | 구글 프로필 사진 |
| `role` | text NOT NULL | `'user'` | `CHECK (role IN ('user','admin'))` |
| `onboarding_completed` | boolean NOT NULL | `false` | 가입 완료 여부 |
| `terms_accepted_at` | timestamptz | NULL | 약관 동의 시각 |
| `created_at` | timestamptz NOT NULL | `now()` | |
| `updated_at` | timestamptz NOT NULL | `now()` | 트리거로 갱신 |

### 트리거

1. `on_auth_user_created` — `auth.users` INSERT 시 `profiles` 행 생성.
   구글 `raw_user_meta_data`의 `name`, `full_name`, `avatar_url`, `picture`에서 값을 꺼낸다.
2. `profiles_protect_role` — BEFORE UPDATE. 호출자가 관리자가 아니면 `role`을 이전 값으로 되돌린다.
3. `profiles_set_updated_at` — BEFORE UPDATE. `updated_at`을 갱신한다.

### RLS 정책

`profiles`에 RLS를 켠다.

| 정책 | 대상 | 조건 |
|---|---|---|
| 본인 조회 | SELECT | `auth.uid() = id` |
| 본인 수정 | UPDATE | `auth.uid() = id` |
| 관리자 전체 조회 | SELECT | `public.is_admin()` |
| 관리자 전체 수정 | UPDATE | `public.is_admin()` |

INSERT/DELETE 정책은 두지 않는다. 행 생성은 트리거(SECURITY DEFINER)가, 삭제는 `auth.users` cascade가 담당한다.

### is_admin() 재귀 문제

관리자 판별을 `profiles`를 조회해 수행하는데, 그 조회 자체가 `profiles`의 RLS 정책을 다시 평가하면 무한 재귀가 발생한다.
따라서 `public.is_admin()`을 `SECURITY DEFINER`로 정의해 RLS를 우회하도록 한다.
`search_path`는 빈 값으로 고정해 스키마 하이재킹을 막는다.

### 권한 상승 차단

`role`은 본인 UPDATE 정책의 사정권 안에 있으므로, 정책만으로는 사용자가 스스로를 `admin`으로 바꾸는 것을 막지 못한다.
`profiles_protect_role` 트리거가 이를 차단한다. 이 트리거가 없으면 누구나 관리자가 될 수 있다.

## 4. 페이지

| 파일 | 접근 | 역할 |
|---|---|---|
| `login.html` | 비로그인 | 구글 버튼. 로그인·가입 겸용 |
| `auth-callback.html` | — | OAuth 복귀 처리 후 분기 |
| `welcome.html` | 로그인, 온보딩 미완료 | 닉네임 확인 + 약관 동의 → 가입 확정 |
| `mypage.html` | 로그인, 온보딩 완료 | 프로필 조회/수정, 로그아웃 |
| `admin.html` | `role = 'admin'` | 회원 목록·검색·권한 변경 |
| `index.html` | 전체 | 글로벌 내비에 계정 항목 추가 (기존 마크업 보존) |

### 리디렉션 규칙

```
비로그인 → 보호 페이지        : login.html
로그인 + 온보딩 미완료         : welcome.html
로그인 + 온보딩 완료 → welcome : mypage.html
비관리자 → admin.html         : mypage.html
로그인 상태 → login.html      : mypage.html
```

## 5. 자바스크립트 구조

기존 `js/main.js`는 수정하지 않는다. ES 모듈로 새 파일을 추가한다.

| 파일 | 책임 | 의존 |
|---|---|---|
| `js/config.js` | Supabase URL, publishable 키 | 없음 |
| `js/supabase-client.js` | 클라이언트 단일 인스턴스 | config |
| `js/auth.js` | 로그인/로그아웃/세션/프로필 조회 | client |
| `js/guard.js` | 페이지 접근 제어 | auth |
| `js/nav-auth.js` | 내비 계정 상태 표시 | auth |
| `js/login.js` | 로그인 화면 동작 | auth |
| `js/welcome.js` | 온보딩 화면 동작 | auth, guard |
| `js/mypage.js` | 마이페이지 동작 | auth, guard |
| `js/admin.js` | 관리자페이지 동작 | auth, guard |

supabase-js는 CDN ESM으로 불러온다. 번들러 없이 `<script type="module">`로 동작한다.

## 6. 키 취급

- 저장소에 들어가는 키는 **publishable 키뿐**이다. 브라우저 노출을 전제로 설계된 키이며, 실제 보호는 RLS가 수행한다.
- `service_role` 키와 `sbp_` 액세스 토큰은 저장소에 넣지 않는다.
- 대화로 전달된 액세스 토큰은 작업 완료 후 재발급을 권고한다.

## 7. 스타일

`css/auth.css`를 새로 만든다. 기존 `css/styles.css`는 수정하지 않는다.
Apple 톤(시스템 폰트 스택, 넓은 여백, `#0071e3` CTA, 12px 라운드)을 따른다.

## 8. 오류 처리

| 상황 | 처리 |
|---|---|
| OAuth 실패·취소 | `login.html`에 사유 표시 |
| 세션 만료 | `login.html`로 이동 |
| 프로필 조회 실패 | 화면에 오류 표시, 빈 화면 금지 |
| 권한 없는 접근 | 조용히 리디렉션 (정보 노출 방지) |
| 네트워크 오류 | 재시도 가능한 오류 메시지 |

## 9. 외부 의존 작업

구글 OAuth 클라이언트 발급은 Google Cloud Console에서 사용자가 직접 수행해야 한다.
`docs/google-oauth-setup.md`에 절차와 리디렉션 URI를 문서화한다.

승인된 리디렉션 URI: `https://swtmrbfkiwzixottysbv.supabase.co/auth/v1/callback`

클라이언트 ID/시크릿을 받으면 Management API로 프로바이더를 활성화한다.

**영향**: 구글 전용이므로 자격증명 확보 전에는 로그인 플로우를 실행할 수 없다.
그 전까지는 DB·RLS·화면 렌더링까지만 검증한다.

## 10. 검증

테스트 프레임워크가 없는 정적 사이트에 테스트 인프라를 새로 도입하는 것은 과잉으로 판단한다.
대신 다음 두 층위로 실동작을 증명한다.

**SQL 검증** (자격증명 없이 즉시 가능)
- 익명 사용자가 `profiles`를 조회하면 0행
- 일반 사용자가 자기 `role`을 `admin`으로 UPDATE해도 값이 유지됨
- 관리자는 전체 행 조회 가능
- `is_admin()` 호출이 재귀 없이 반환

**브라우저 검증** (구글 설정 후)
- 구글 로그인 → 온보딩 → 마이페이지 진입
- 프로필 수정 후 새로고침 시 값 유지
- 비관리자의 `admin.html` 직접 접근 차단
- 관리자 승격 후 회원 목록 노출 및 권한 변경
- 로그아웃 후 보호 페이지 접근 차단

## 11. 작업 순서

1. DB 스키마 · 트리거 · RLS 적용 및 SQL 검증
2. 공용 JS 모듈 (config, client, auth, guard)
3. `css/auth.css`
4. `login.html` + `auth-callback.html`
5. `welcome.html` (온보딩)
6. `mypage.html`
7. `admin.html`
8. `index.html` 내비 연동
9. `docs/google-oauth-setup.md` 작성
10. 구글 자격증명 수령 후 프로바이더 활성화
11. 브라우저 전체 플로우 검증
