/* =========================================================
   글로벌 내비 계정 상태

   index.html 의 기존 내비를 건드리지 않고, 자리표시 요소 하나에
   로그인 상태에 맞는 링크를 채워 넣는다.
   로그인 여부 판단이 늦어도 레이아웃이 흔들리지 않도록
   자리표시 요소는 비어 있는 채로 시작한다.
   ========================================================= */

import { getSession, getMyProfile } from './auth.js';
import { renderAvatar, displayNameOf } from './ui.js';
import { ROUTES } from './config.js';

const slot = document.getElementById('navAccount');

function link(href, label) {
  const anchor = document.createElement('a');
  anchor.className = 'gnav-account';
  anchor.href = href;

  const text = document.createElement('span');
  text.textContent = label;
  anchor.append(text);
  return anchor;
}

async function init() {
  if (!slot) return;

  const { data: session } = await getSession();

  if (!session) {
    slot.replaceChildren(link(ROUTES.login, '로그인'));
    return;
  }

  const { data: profile } = await getMyProfile(session.user.id);

  if (!profile) {
    slot.replaceChildren(link(ROUTES.login, '로그인'));
    return;
  }

  const target = profile.onboarding_completed ? ROUTES.mypage : ROUTES.welcome;
  const anchor = link(target, displayNameOf(profile));
  anchor.setAttribute('aria-label', '마이페이지');

  const img = document.createElement('img');
  img.alt = '';
  const fallback = document.createElement('span');
  fallback.setAttribute('aria-hidden', 'true');
  renderAvatar(img, fallback, profile);

  // 사진이 있을 때만 앞에 붙인다. 없으면 이름만 보여준다.
  if (!img.hidden) anchor.prepend(img);

  slot.replaceChildren(anchor);
}

init();
