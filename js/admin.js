/* =========================================================
   관리자페이지 — 회원 목록 · 권한 변경

   표는 DOM API 로 만든다. 이름·이메일은 사용자가 정한 값이므로
   innerHTML 로 조립하면 스크립트 주입 통로가 된다.
   ========================================================= */

import { requireAdmin } from './guard.js';
import { listAllProfiles, setUserRole } from './auth.js';
import { renderAvatar, roleBadge, formatDate, displayNameOf } from './ui.js';

const el = (id) => document.getElementById(id);

const page = el('page');
const loading = el('loading');
const errorBox = el('errorBox');
const successBox = el('successBox');
const tableBody = el('tableBody');
const emptyBox = el('emptyBox');
const searchInput = el('searchInput');
const countText = el('countText');
const refreshBtn = el('refreshBtn');

/** 현재 화면 상태. 갱신 시 새 배열로 갈아끼우고 제자리 수정하지 않는다. */
let profiles = [];
let currentUserId = null;

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

function matches(profile, keyword) {
  if (!keyword) return true;
  const haystack = `${profile.display_name || ''} ${profile.full_name || ''} ${profile.email || ''}`;
  return haystack.toLowerCase().includes(keyword);
}

function buildUserCell(profile) {
  const cell = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'cell-user';

  const img = document.createElement('img');
  img.className = 'avatar';
  img.alt = '';

  const fallback = document.createElement('div');
  fallback.className = 'avatar avatar-fallback';
  fallback.setAttribute('aria-hidden', 'true');

  renderAvatar(img, fallback, profile);

  const text = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'cell-name';
  name.textContent = displayNameOf(profile);

  const email = document.createElement('div');
  email.className = 'cell-email';
  email.textContent = profile.email || '';

  text.append(name, email);
  wrap.append(img, fallback, text);
  cell.append(wrap);
  return cell;
}

function buildActionCell(profile) {
  const cell = document.createElement('td');
  const isSelf = profile.id === currentUserId;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-quiet';

  if (isSelf) {
    // 마지막 관리자가 스스로 강등하면 아무도 권한을 되돌릴 수 없게 된다.
    button.textContent = '본인';
    button.disabled = true;
    button.title = '본인의 권한은 이 화면에서 바꿀 수 없습니다.';
  } else {
    const nextRole = profile.role === 'admin' ? 'user' : 'admin';
    button.textContent = nextRole === 'admin' ? '관리자로' : '일반으로';
    button.addEventListener('click', () => changeRole(profile, nextRole, button));
  }

  cell.append(button);
  return cell;
}

function buildRow(profile) {
  const row = document.createElement('tr');
  if (profile.id === currentUserId) row.className = 'row-self';

  const roleCell = document.createElement('td');
  roleCell.append(roleBadge(profile.role));

  const createdCell = document.createElement('td');
  createdCell.textContent = formatDate(profile.created_at);

  const stateCell = document.createElement('td');
  stateCell.textContent = profile.onboarding_completed ? '가입 완료' : '가입 미완료';

  row.append(buildUserCell(profile), roleCell, createdCell, stateCell, buildActionCell(profile));
  return row;
}

function render() {
  const keyword = searchInput.value.trim().toLowerCase();
  const visible = profiles.filter((profile) => matches(profile, keyword));

  tableBody.replaceChildren(...visible.map(buildRow));
  emptyBox.hidden = visible.length > 0;
  countText.textContent = keyword
    ? `${visible.length}명 / 전체 ${profiles.length}명`
    : `전체 ${profiles.length}명`;
}

async function changeRole(profile, nextRole, button) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = '변경 중…';

  const { data, error } = await setUserRole(profile.id, nextRole);

  if (error) {
    showError(error);
    button.disabled = false;
    button.textContent = label;
    return;
  }

  // 반환된 행으로 교체한다. 원본 배열을 제자리에서 고치지 않는다.
  profiles = profiles.map((item) => (item.id === data.id ? data : item));
  render();
  showSuccess(`${displayNameOf(data)} 님의 권한을 ${nextRole === 'admin' ? '관리자' : '일반'}(으)로 변경했습니다.`);
}

async function load() {
  refreshBtn.disabled = true;

  const { data, error } = await listAllProfiles();

  refreshBtn.disabled = false;

  if (error) {
    showError(error);
    return;
  }

  profiles = data;
  render();
}

async function init() {
  const result = await requireAdmin();
  if (!result) return;

  currentUserId = result.profile.id;

  await load();

  loading.hidden = true;
  page.hidden = false;

  searchInput.addEventListener('input', render);
  refreshBtn.addEventListener('click', load);
}

init();
