/* =========================================================
   온보딩(회원가입 확정) 화면
   ========================================================= */

import { requireAuth } from './guard.js';
import { completeOnboarding, signOut } from './auth.js';
import { renderAvatar } from './ui.js';
import { ROUTES } from './config.js';

const el = (id) => document.getElementById(id);

const card = el('card');
const loading = el('loading');
const errorBox = el('errorBox');
const form = el('onboardForm');
const displayName = el('displayName');
const agree = el('agree');
const submitBtn = el('submitBtn');

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

async function init() {
  // 온보딩 미완료 상태만 이 화면에 머문다.
  const result = await requireAuth({ allowUnonboarded: true });
  if (!result) return;

  const { profile } = result;

  el('googleName').textContent = profile.full_name || '이름 없음';
  el('googleEmail').textContent = profile.email || '';
  displayName.value = profile.display_name || profile.full_name || '';
  renderAvatar(el('avatar'), el('avatarFallback'), profile);

  loading.hidden = true;
  card.hidden = false;
  displayName.focus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;

    if (!agree.checked) {
      showError('약관에 동의해야 가입을 완료할 수 있습니다.');
      agree.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '가입 처리 중…';

    const { error } = await completeOnboarding(profile.id, displayName.value);

    if (error) {
      showError(error);
      submitBtn.disabled = false;
      submitBtn.textContent = '가입 완료하기';
      return;
    }

    window.location.replace(ROUTES.mypage);
  });

  el('signOutLink').addEventListener('click', async (event) => {
    event.preventDefault();
    await signOut();
    window.location.replace(ROUTES.login);
  });
}

init();
