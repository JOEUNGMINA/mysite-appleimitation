/* =========================================================
   OAuth 복귀 처리

   supabase 클라이언트가 detectSessionInUrl 로 인가 코드를 세션으로 바꾼 뒤,
   프로필 상태에 따라 갈 곳을 정한다.

   신규 가입자는 프로필 행이 DB 트리거로 만들어지므로 아주 짧은 지연이
   있을 수 있다. 한 번 실패했다고 로그인 화면으로 되돌리면 첫 가입이
   실패한 것처럼 보이므로 몇 차례 다시 확인한다.
   ========================================================= */

import { getSession, getMyProfile } from './auth.js';
import { ROUTES } from './config.js';

const statusText = document.getElementById('statusText');
const errorBox = document.getElementById('errorBox');
const retryWrap = document.getElementById('retryWrap');

const PROFILE_RETRIES = 5;
const PROFILE_RETRY_DELAY_MS = 400;

function fail(message) {
  statusText.hidden = true;
  errorBox.textContent = message;
  errorBox.hidden = false;
  retryWrap.hidden = false;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 구글이 거절·취소를 알려온 경우 로그인 화면이 사유를 표시하도록 넘겨준다. */
function forwardOAuthError() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = query.get('error') || hash.get('error');

  if (!code) return false;

  const params = new URLSearchParams({ error: code });
  const description = query.get('error_description') || hash.get('error_description');
  if (description) params.set('error_description', description);

  window.location.replace(`${ROUTES.login}?${params.toString()}`);
  return true;
}

async function init() {
  if (forwardOAuthError()) return;

  const { data: session, error: sessionError } = await getSession();

  if (sessionError) {
    fail(sessionError);
    return;
  }
  if (!session) {
    fail('로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.');
    return;
  }

  for (let attempt = 1; attempt <= PROFILE_RETRIES; attempt += 1) {
    const { data: profile } = await getMyProfile(session.user.id);

    if (profile) {
      window.location.replace(profile.onboarding_completed ? ROUTES.mypage : ROUTES.welcome);
      return;
    }

    if (attempt === 1) {
      statusText.textContent = '계정을 준비하고 있습니다…';
    }
    await wait(PROFILE_RETRY_DELAY_MS);
  }

  fail('계정 정보를 준비하지 못했습니다. 잠시 후 다시 로그인해 주세요.');
}

init();
