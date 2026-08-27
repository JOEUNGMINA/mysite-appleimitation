/* =========================================================
   로그인 화면
   ========================================================= */

import { signInWithGoogle } from './auth.js';
import { redirectIfAuthenticated } from './guard.js';

const errorBox = document.getElementById('errorBox');
const googleBtn = document.getElementById('googleBtn');
const googleBtnLabel = document.getElementById('googleBtnLabel');

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

/**
 * OAuth 실패는 리디렉션 주소의 쿼리 또는 해시로 돌아온다.
 * 사용자가 구글 동의 화면에서 취소한 경우도 여기로 온다.
 */
function readOAuthError() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = query.get('error') || hash.get('error');

  if (!code) return null;

  if (code === 'access_denied') {
    return '구글 로그인이 취소되었습니다.';
  }
  return query.get('error_description') || hash.get('error_description') || '구글 로그인에 실패했습니다. 다시 시도해 주세요.';
}

async function init() {
  const oauthError = readOAuthError();
  if (oauthError) {
    showError(oauthError);
    // 새로고침해도 같은 오류가 다시 뜨지 않도록 주소를 정리한다.
    window.history.replaceState({}, '', window.location.pathname);
  }

  // 이미 로그인한 사람은 머무를 이유가 없다.
  const redirected = await redirectIfAuthenticated();
  if (redirected) return;

  googleBtn.addEventListener('click', async () => {
    errorBox.hidden = true;
    googleBtn.disabled = true;
    googleBtnLabel.textContent = '구글로 이동 중…';

    const { error } = await signInWithGoogle();

    // 정상이라면 브라우저가 이미 구글로 떠났으므로 여기까지 오지 않는다.
    if (error) {
      showError(error);
      googleBtn.disabled = false;
      googleBtnLabel.textContent = '구글로 계속하기';
    }
  });
}

init();
