/* =========================================================
   페이지 접근 제어

   각 보호 페이지는 첫 줄에서 이 모듈의 함수 하나만 부르면 된다.
   반환값이 null 이면 이미 리디렉션이 시작된 것이므로 화면을 그리지 않는다.

   리디렉션 규칙
     비로그인       → 보호 페이지  : login
     온보딩 미완료   → 보호 페이지  : welcome
     온보딩 완료     → welcome     : mypage
     비관리자       → admin       : mypage
     로그인 상태     → login       : mypage
   ========================================================= */

import { getSession, getMyProfile } from './auth.js';
import { ROUTES } from './config.js';

function go(path) {
  window.location.replace(path);
  return null;
}

/**
 * 로그인 + 온보딩 완료를 요구한다.
 * @param {{ allowUnonboarded?: boolean }} [options]
 *   allowUnonboarded 가 true 면 온보딩 미완료 상태를 통과시킨다 (welcome 페이지 전용).
 * @returns {Promise<{ session: object, profile: object } | null>}
 */
export async function requireAuth(options = {}) {
  const { data: session, error: sessionError } = await getSession();

  if (sessionError || !session) {
    return go(ROUTES.login);
  }

  const { data: profile, error: profileError } = await getMyProfile(session.user.id);

  if (profileError || !profile) {
    return go(ROUTES.login);
  }

  if (!profile.onboarding_completed && !options.allowUnonboarded) {
    return go(ROUTES.welcome);
  }

  // 이미 가입을 마친 사람이 welcome 에 머무를 이유가 없다.
  if (profile.onboarding_completed && options.allowUnonboarded) {
    return go(ROUTES.mypage);
  }

  return { session, profile };
}

/** 관리자 전용 페이지. 권한이 없으면 사유를 알리지 않고 조용히 돌려보낸다. */
export async function requireAdmin() {
  const result = await requireAuth();
  if (!result) return null;

  if (result.profile.role !== 'admin') {
    return go(ROUTES.mypage);
  }
  return result;
}

/** 로그인 페이지 전용. 이미 로그인했다면 머무를 필요가 없다. */
export async function redirectIfAuthenticated() {
  const { data: session } = await getSession();
  if (!session) return false;

  const { data: profile } = await getMyProfile(session.user.id);
  if (!profile) return false;

  go(profile.onboarding_completed ? ROUTES.mypage : ROUTES.welcome);
  return true;
}
