/* =========================================================
   마이페이지
   ========================================================= */

import { requireAuth } from './guard.js';
import { updateMyProfile, signOut } from './auth.js';
import { renderAvatar, roleBadge, formatDate, displayNameOf } from './ui.js';
import { ROUTES } from './config.js';

const el = (id) => document.getElementById(id);

const card = el('card');
const loading = el('loading');
const errorBox = el('errorBox');
const successBox = el('successBox');
const form = el('profileForm');
const displayName = el('displayName');
const saveBtn = el('saveBtn');

function showError(message) {
  successBox.hidden = true;
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function showSuccess(message) {
  errorBox.hidden = true;
  successBox.textContent = message;
  successBox.hidden = false;
}

function render(profile) {
  el('headName').textContent = displayNameOf(profile);
  el('headEmail').textContent = profile.email || '';
  displayName.value = profile.display_name || '';
  el('email').value = profile.email || '';

  renderAvatar(el('avatar'), el('avatarFallback'), profile);

  el('roleCell').replaceChildren(roleBadge(profile.role));
  el('createdCell').textContent = formatDate(profile.created_at);
  el('termsCell').textContent = formatDate(profile.terms_accepted_at);

  el('adminLink').hidden = profile.role !== 'admin';
}

async function init() {
  const result = await requireAuth();
  if (!result) return;

  let profile = result.profile;
  render(profile);

  loading.hidden = true;
  card.hidden = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중…';

    const { data, error } = await updateMyProfile(profile.id, {
      display_name: displayName.value,
    });

    saveBtn.disabled = false;
    saveBtn.textContent = '저장';

    if (error) {
      showError(error);
      return;
    }

    profile = data;
    render(profile);
    showSuccess('저장했습니다.');
  });

  el('signOutBtn').addEventListener('click', async () => {
    const { error } = await signOut();
    if (error) {
      showError(error);
      return;
    }
    window.location.replace(ROUTES.home);
  });
}

init();
