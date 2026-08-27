/* =========================================================
   인증 · 프로필 접근 계층

   화면 코드가 supabase 클라이언트를 직접 만지지 않도록 하는 경계.
   모든 함수는 예외를 던지지 않고 { data, error } 형태로 반환한다.
   error 는 사용자에게 그대로 보여줘도 되는 한국어 문장이다.
   ========================================================= */

import { supabase } from './supabase-client.js';
import { OAUTH_REDIRECT_PATH } from './config.js';

/** 프로필 조회 시 가져올 컬럼. 한 곳에서 관리해 화면마다 어긋나지 않게 한다. */
const PROFILE_COLUMNS =
  'id, email, full_name, display_name, avatar_url, role, onboarding_completed, terms_accepted_at, created_at';

/**
 * Supabase 오류를 사용자에게 보여줄 문장으로 바꾼다.
 * 원인 문자열을 그대로 노출하면 내부 구조가 새므로 알려진 것만 번역한다.
 */
function toMessage(error, fallback) {
  if (!error) return fallback;

  const raw = String(error.message || '');

  if (/Failed to fetch|NetworkError|network/i.test(raw)) {
    return '네트워크에 연결할 수 없습니다. 인터넷 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (/provider is not enabled|Unsupported provider/i.test(raw)) {
    return '구글 로그인이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.';
  }
  if (/JWT|token is expired|session/i.test(raw)) {
    return '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.';
  }
  return fallback;
}

/** 구글 로그인 시작. 성공하면 브라우저가 구글로 이동하므로 이 함수는 반환되지 않는다. */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + OAUTH_REDIRECT_PATH,
      queryParams: {
        // 이름·사진이 바뀌었을 수 있으므로 매번 최신 프로필을 받는다.
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    return { error: toMessage(error, '구글 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.') };
  }
  return { error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: toMessage(error, '로그아웃에 실패했습니다. 잠시 후 다시 시도해 주세요.') };
  }
  return { error: null };
}

/** 현재 세션. 로그인하지 않았으면 data 가 null 이며 이는 오류가 아니다. */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { data: null, error: toMessage(error, '로그인 상태를 확인하지 못했습니다.') };
  }
  return { data: data.session, error: null };
}

/** 본인 프로필. RLS 가 남의 행을 걸러주므로 별도 조건이 필요 없다. */
export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { data: null, error: toMessage(error, '프로필을 불러오지 못했습니다.') };
  }
  if (!data) {
    // 가입 트리거가 아직 반영되지 않았거나 행이 사라진 경우.
    return { data: null, error: '프로필을 찾을 수 없습니다. 다시 로그인해 주세요.' };
  }
  return { data, error: null };
}

/**
 * 본인 프로필 수정.
 * role 은 의도적으로 받지 않는다. 서버 트리거도 막지만 여기서도 보내지 않는다.
 */
export async function updateMyProfile(userId, patch) {
  const allowed = {};
  if (typeof patch.display_name === 'string') {
    allowed.display_name = patch.display_name.trim();
  }

  if (Object.keys(allowed).length === 0) {
    return { data: null, error: '변경할 내용이 없습니다.' };
  }
  if (allowed.display_name !== undefined && allowed.display_name.length === 0) {
    return { data: null, error: '이름을 입력해 주세요.' };
  }
  if (allowed.display_name !== undefined && allowed.display_name.length > 40) {
    return { data: null, error: '이름은 40자 이내로 입력해 주세요.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(allowed)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) {
    return { data: null, error: toMessage(error, '프로필을 저장하지 못했습니다.') };
  }
  return { data, error: null };
}

/** 온보딩(가입) 확정. 닉네임과 약관 동의 시각을 함께 기록한다. */
export async function completeOnboarding(userId, displayName) {
  const name = String(displayName || '').trim();

  if (name.length === 0) {
    return { data: null, error: '사용하실 이름을 입력해 주세요.' };
  }
  if (name.length > 40) {
    return { data: null, error: '이름은 40자 이내로 입력해 주세요.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: name,
      onboarding_completed: true,
      terms_accepted_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) {
    return { data: null, error: toMessage(error, '가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.') };
  }
  return { data, error: null };
}

/** 전체 회원 목록. RLS 가 관리자에게만 전체 행을 돌려준다. */
export async function listAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: toMessage(error, '회원 목록을 불러오지 못했습니다.') };
  }
  return { data: data || [], error: null };
}

/** 회원 권한 변경. 관리자가 아니면 서버가 조용히 되돌리므로 결과를 다시 읽어 확인한다. */
export async function setUserRole(targetUserId, nextRole) {
  if (nextRole !== 'user' && nextRole !== 'admin') {
    return { data: null, error: '알 수 없는 권한입니다.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: nextRole })
    .eq('id', targetUserId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) {
    return { data: null, error: toMessage(error, '권한을 변경하지 못했습니다.') };
  }
  if (!data) {
    return { data: null, error: '권한을 변경할 수 없습니다. 관리자 권한을 확인해 주세요.' };
  }
  if (data.role !== nextRole) {
    // 트리거가 되돌린 경우. 관리자가 아닌 계정이 시도했다는 뜻이다.
    return { data: null, error: '권한이 없어 변경이 거부되었습니다.' };
  }
  return { data, error: null };
}
