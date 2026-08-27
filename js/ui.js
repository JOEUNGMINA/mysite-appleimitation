/* =========================================================
   화면 공용 표시 헬퍼

   여러 화면에서 같은 모양으로 보여야 하는 조각만 모은다.
   DOM 을 만들어 돌려줄 뿐 데이터는 가져오지 않는다.
   ========================================================= */

/** 표시용 이름. 닉네임 → 구글 이름 → 이메일 순으로 되짚는다. */
export function displayNameOf(profile) {
  return profile.display_name || profile.full_name || profile.email || '이름 없음';
}

/** 사진이 없거나 불러오지 못하는 계정을 위한 첫 글자. */
export function initialOf(profile) {
  return displayNameOf(profile).trim().charAt(0).toUpperCase();
}

/**
 * 아바타 이미지와 첫 글자 대체 요소를 함께 제어한다.
 * 구글 이미지 요청이 막히는 환경이 있어 실패 시 조용히 첫 글자로 되돌린다.
 */
export function renderAvatar(imgEl, fallbackEl, profile) {
  fallbackEl.textContent = initialOf(profile);

  if (!profile.avatar_url) {
    imgEl.hidden = true;
    fallbackEl.hidden = false;
    return;
  }

  imgEl.src = profile.avatar_url;
  imgEl.hidden = false;
  fallbackEl.hidden = true;
  imgEl.addEventListener('error', () => {
    imgEl.hidden = true;
    fallbackEl.hidden = false;
  }, { once: true });
}

/** 권한 배지 요소. 화면마다 색이 어긋나지 않도록 한 곳에서 만든다. */
export function roleBadge(role) {
  const span = document.createElement('span');
  const isAdmin = role === 'admin';
  span.className = isAdmin ? 'badge badge-admin' : 'badge badge-user';
  span.textContent = isAdmin ? '관리자' : '일반';
  return span;
}

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}
