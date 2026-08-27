/* =========================================================
   Supabase 접속 설정

   여기 들어가는 키는 publishable 키 하나뿐이다.
   브라우저 노출을 전제로 설계된 공개 키이며, 실제 데이터 보호는
   서버 측 RLS 정책이 수행한다.

   service_role 키와 개인 액세스 토큰(sbp_...)은 절대 이 파일에 넣지 않는다.
   ========================================================= */

export const SUPABASE_URL = 'https://swtmrbfkiwzixottysbv.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_z3i9wyEB4yjUkdeRGPk87A_QKd2NU-m';

/** 로그인 후 돌아올 주소. 파일 경로가 아니라 실제 origin 기준이어야 한다. */
export const OAUTH_REDIRECT_PATH = '/auth-callback.html';

/** 페이지 경로를 한 곳에서 관리해 리디렉션 로직이 문자열에 흩어지지 않게 한다. */
export const ROUTES = Object.freeze({
  home: '/index.html',
  login: '/login.html',
  welcome: '/welcome.html',
  mypage: '/mypage.html',
  admin: '/admin.html',
});
