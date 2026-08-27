/* =========================================================
   Supabase 클라이언트 단일 인스턴스

   빌드 도구가 없는 정적 사이트이므로 CDN ESM 번들을 직접 가져온다.
   ========================================================= */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // PKCE: 브라우저에 시크릿을 두지 않고 인가 코드를 교환한다.
    flowType: 'pkce',
    // 리디렉션으로 돌아온 URL의 인가 코드를 자동으로 세션으로 바꾼다.
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
