# google-auth — 컨텍스트

**Last Updated**: 2026-08-27

## 현재 상태

1~9단계 완료. 구글 자격증명만 대기 중이며, 그 외 전 기능은 브라우저에서 검증 완료.
발견·수정한 결함 3건은 `google-auth-tasks.md` 하단 참조.

## Supabase

| 항목 | 값 |
|---|---|
| 프로젝트명 | `mywebsite_test` |
| ref | `swtmrbfkiwzixottysbv` |
| URL | `https://swtmrbfkiwzixottysbv.supabase.co` |
| 리전 | ap-northeast-2 |
| publishable 키 | `sb_publishable_z3i9wyEB4yjUkdeRGPk87A_QKd2NU-m` |
| site_url | `http://localhost:3000` (변경 불필요) |
| 구글 프로바이더 | **비활성** — 자격증명 대기 중 |

`service_role` 키와 `sbp_` 액세스 토큰은 이 문서를 포함해 저장소 어디에도 기록하지 않는다.

SQL 적용은 Management API로 수행한다 (DB 비밀번호 불필요):

```
POST https://api.supabase.com/v1/projects/swtmrbfkiwzixottysbv/database/query
Authorization: Bearer <액세스 토큰>
{"query": "..."}
```

## 기존 파일 (수정 금지)

| 경로 | 줄수 | 비고 |
|---|---|---|
| `index.html` | ~200 | 내비에 계정 항목만 추가 |
| `css/styles.css` | 598 | 수정하지 않음 |
| `js/main.js` | 123 | 수정하지 않음 |

빌드 도구·package.json 없음. 순수 정적 사이트.

## 신규 파일

```
css/auth.css
js/config.js  js/supabase-client.js  js/auth.js  js/guard.js  js/nav-auth.js
js/login.js  js/welcome.js  js/mypage.js  js/admin.js
login.html  auth-callback.html  welcome.html  mypage.html  admin.html
supabase/migrations/*.sql
docs/google-oauth-setup.md
```

## 핵심 의사결정

| 결정 | 이유 |
|---|---|
| 정적 유지 + supabase-js CDN | 기존 코드 보존, 빌드 도구 불필요 |
| 구글 OAuth 전용 | 사용자가 이메일 가입 제외를 명시 |
| `profiles.role` 로 관리자 판별 | 코드 수정 없이 관리자 증감 |
| 첫 로그인 시 온보딩 단계 | 가입과 로그인을 체감상 구분 |

## 함정 (반드시 지킬 것)

1. **RLS 무한 재귀** — 관리자 정책이 `profiles`를 직접 조회하면 정책이 재귀 평가된다.
   반드시 `public.is_admin()` 을 `SECURITY DEFINER` 로 정의해 우회한다.
2. **권한 상승** — 본인 UPDATE 정책이 `role` 컬럼까지 허용하므로,
   `profiles_protect_role` 트리거 없이는 누구나 스스로를 관리자로 만들 수 있다.
3. **search_path** — `SECURITY DEFINER` 함수는 `search_path = ''` 로 고정하고
   모든 객체를 스키마 수식(`public.profiles`)으로 참조한다.
4. **file:// 금지** — OAuth 리디렉션이 동작하지 않는다. 반드시 `http://localhost:3000`.
5. **serve.json 삭제 금지** — `cleanUrls` 가 켜지면 `/auth-callback.html?code=...` 가
   301 되면서 쿼리가 사라져 인가 코드를 잃는다.
6. **`[hidden]` 무력화** — display 를 지정한 클래스는 브라우저 기본 `[hidden]` 규칙을
   덮어쓴다. `auth.css` 상단의 전역 `[hidden]` 규칙을 지우지 말 것.

## 외부 의존 (차단 요인)

구글 OAuth 클라이언트 발급은 사용자가 Google Cloud Console에서 직접 수행해야 한다.

- 승인된 리디렉션 URI: `https://swtmrbfkiwzixottysbv.supabase.co/auth/v1/callback`
- 승인된 JavaScript 원본: `http://localhost:3000`

구글 전용이므로 **자격증명 확보 전에는 로그인 플로우 실행 불가**.
1~9단계는 병행 가능하며, 10~11단계만 대기한다.

## 로컬 실행

```
npx serve . -l 3000
```

## 관련 문서

- 설계 원본: `docs/superpowers/specs/2026-08-27-google-auth-design.md`
